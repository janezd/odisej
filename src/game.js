import React from "react"
import { Panel, Button, Media, Modal, Label, FormControl, ControlLabel, DropdownButton, MenuItem } from 'react-bootstrap'
import blocks from "./createBlocks"
import { locations, items, flags, variables, allLocations, restoreLocally, storeLocally, packBlockArgs } from './quill'

import Compass from './compass.js'

const ITEM_CARRIED = -1
const ITEM_DOES_NOT_EXIST = -2



const AdderRemover = (props) => (
    <div>
        { props.model.getNamesIds()
        .filter(([name, id]) => props.selector(id))
        .map(([name, id]) =>
            <span key={id}>
                <Label bsStyle="danger" onClick={() => props.changer(id, false)}>x</Label>
                <Label bsStyle="success">{name}</Label>
                <span> </span>
            </span>)}
        <DropdownButton id={props.title} bsSize="xsmall" title={props.title}>
            {props.model.getNamesIds()
                .filter(([name, id]) => !props.selector(id))
                .map(([name, id]) => <MenuItem key={id} eventKey={id} onSelect={() => props.changer(id, true)}>{name}</MenuItem>)
            }
        </DropdownButton>
    </div>
)

class ShowGameState extends React.Component {
    constructor() {
        super()
        this.changeFlag = this.changeFlag.bind(this)
    }

    saveState = () => {
        const {location, items, flags, variables} = this.props.state
        const blob = new Blob(
            [JSON.stringify({location, items, flags, variables})],
            { type: 'text/plain' })
        const anchor = document.createElement('a');
        anchor.download = "stanje-igre.json";
        anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
        anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':')
        anchor.click()
    }

    loadState = files => {
        const reader = new FileReader()
        reader.onload = e => this.props.setGameState(JSON.parse(e.target.result))
        reader.readAsText(files[0])
    }

    setLocation = location => this.props.setGameState({location})

    changeFlag = (flag, state) => {
        const flags = this.props.state.flags
        flags[flag] = state
        this.props.setGameState({flags})
    }

    takeDropItem = (item, state) => {
        const items = this.props.state.items
        items[item] = state ? ITEM_CARRIED : ITEM_DOES_NOT_EXIST
        this.props.setGameState({items})
    }

    setVariable = (id, value) => {
        const variables = this.props.state.variables
        variables[id] = value
        this.props.setGameState({variables})
    }

    render() {
        const state = this.props.state

        return <Modal show={true} onHide={this.props.handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>
                    Stanje igre
                    <Label bsStyle="success" onClick={this.saveState}>Shrani</Label>
                    <FormControl id="stateUpload" style={{display: "none"}} type="file" accept=".json"
                                 onChange={e => this.loadState(e.target.files)}/>
                    <ControlLabel htmlFor="stateUpload">
                        <Label bsStyle="success">Naloži</Label>
                    </ControlLabel>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <dl className="dl-horizontal">
                    <dt>Trenutna lokacija:</dt>
                    <dd>
                        <DropdownButton id="current-location"
                                        bsSize="xsmall"
                                        title={locations.getLocation(state.location).title}>
                            { locations.getIds().map(it =>
                                <MenuItem key={it} eventKey={it} onSelect={this.setLocation}>
                                    {locations.getLocation(it).title}</MenuItem>
                            )}
                        </DropdownButton>
                    </dd>


                    <dt>Zastavice:</dt>
                    <dd><AdderRemover title="Postavi zastavico"
                                      model={flags}
                                      selector={id => state.flags[id]}
                                      changer={this.changeFlag} /></dd>

                    <dt>Igralec ima:</dt>
                    <dd><AdderRemover title="Vzemi stvar"
                                      model={items}
                                      selector={id => state.items[id] == ITEM_CARRIED}
                                      changer={this.takeDropItem}/></dd>

                    <dt>Spremenljivke:</dt>
                    <dd>{[...Object.entries(state.variables)]
                        .map(([id, value]) => <span key={id}>
                                {variables.getNameById(id)}&nbsp;=&nbsp;
                            <span
                                onKeyDown = {
                                    e => {
                                        if (e.keyCode == 13) {
                                            const target = e.target
                                            if (target.innerText == "")
                                                target.innerText = "0"
                                            this.setVariable(id, parseInt(target.innerText))
                                            target.blur()
                                        }
                                        if ("0123456789\x08\x25\x27\x2e".indexOf(String.fromCharCode(e.keyCode)) == -1) {
                                            e.preventDefault()
                                        }
                                    }
                                }
                                ref={node => { if (node) node.setAttribute("contentEditable", true)} }>
                                {value}
                            </span>
                        </span>)
                    }</dd>
                </dl>
            </Modal.Body>
        </Modal>
    }
}


export default class Game extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            location: locations.startLocation,
            printed: [],
            items: this._obj_from_keys(items.getIds(), ITEM_DOES_NOT_EXIST),
            flags: this._obj_from_keys(flags.getIds()),
            variables: this._obj_from_keys(variables.getIds()),
            showState: false,
            delayed: 0
        }
    }

    _obj_from_keys = (keys, deflt=0) => {
        const res = {}
        keys.forEach(key => res[key] = deflt)
        return res
    }

    moveTo = (location) => {
        this.autoExecuteBlocks("on_exit")
        this.setState(
            {location: location, printed: []},
            () => this.autoExecuteBlocks("on_entry"))
    }

    print = (msg) => {
        const {printed} = this.state
        printed.push(msg)
        this.setState({printed})
    }

    delay = (ms) => {
        this.state.delayed = ms // can't wait, I can't solve this by callback
        this.forceUpdate()
    }

    autoExecuteBlocks = (blockType) => {
        locations.getLocation(this.state.location).commands.concat(allLocations.commands)
            .filter(it => (it.block == blockType))
            .forEach(it => this.executeSequence(it.next))
        this.setState({})
    }

    executeStatement = (block) => {
        this.print(<b>&gt; {block.name}</b>)
        this.executeSequence(block.next)
        this.setState({}, () => this.autoExecuteBlocks("after_command"))
    }

    checkConditionList = (conditions, conjunctive=true) => {
        const comp = (op, op1, op2) => {
            switch (op) {
                case 'EQ': return op1 == op2
                case 'NE': return op1 != op2
                case 'LT': return op1 < op2
                case 'GT': return op1 > op2
                case 'LE': return op1 <= op2
                case 'GE': return op1 >= op2
            }
        }

        const checkCondition = condition => {
            switch (condition.block) {
                case 'not': return !checkCondition(condition.not)

                case 'disjunction': return this.checkConditionList(condition.allow, false)

                case 'is_at': return this.state.location == condition.location

                case 'does_have': return this.state.items[condition.item] == ITEM_CARRIED
                case 'item_is_at': return this.state.items[condition.item] == condition.location
                case 'item_exists': return this.state.items[condition.item] != ITEM_DOES_NOT_EXIST
                case 'item_is_here': return this.state.items[condition.item] == this.state.location

                case 'flag_set': return this.state.flags[condition.flag]
                case 'flag_clear': return !this.state.flags[condition.flag]

                case 'compare_const': return comp(condition.operator, this.state.variables[condition.variable], parseInt(condition.constant))
                case 'compare_var': return comp(condition.operator, this.state.variables[condition.variable], this.state.variables[condition.variable2])

                case 'random': return 100 * Math.random() > parseInt(condition.constant)
            }
        }

        if (conditions) {
            for (let condition of conditions) {
                const fulfilled = checkCondition(condition)
                if (fulfilled != conjunctive)
                    return fulfilled
            }
        }
        return conjunctive
    }

    executeSequence = (blocks, blockIndex=0, skipElses=false) => {
        const conditionalExecute = block => {
            if (this.checkConditionList(block.allow)) {
                skipElses = true
                this.executeSequence(block.statements)
            }
        }

        this.state.delayed = 0
        if (blockIndex < blocks.length) {
            const block = blocks[blockIndex]
            switch (block.block) {
                case 'if': skipElses = false; conditionalExecute(block); break
                case 'elif': if (!skipElses) conditionalExecute(block); break
                case 'else': if (!skipElses) this.executeSequence(block.statements); break
                default: skipElses = false; this.executeBlock(block)
            }
            const doNext = () => this.executeSequence(blocks, blockIndex + 1, skipElses)
            if (this.state.delayed) {
                setTimeout(doNext, this.state.delayed)
            }
            else {
                doNext()
            }
        }
    }

    executeBlock = (block) => {
        switch (block.block) {
            case 'go': return this.moveTo(block.location)
            case 'print': return this.print(block.msg)
            case 'delay': return this.delay(1000 * parseInt(block.constant)); break;

            case 'pick': this.state.items[block.item] = ITEM_CARRIED; break
            case 'drop': this.state.items[block.item] = this.state.location; break
            case 'item_at': this.state.items[block.item] = block.location; break
            case 'destroy': this.state.items[block.item] = ITEM_DOES_NOT_EXIST; break

            case 'set_flag': this.state.flags[block.flag] = true; break
            case 'clear_flag': this.state.flags[block.flag] = false; break

            case 'set_const': this.state.variables[block.variable] = parseInt(block.constant); break
            case 'increase': this.state.variables[block.variable]++; break
            case 'decrease': this.state.variables[block.variable]--; break
            case 'add_const': this.state.variables[block.variable] += parseInt(block.constant); break
            case 'sub_const': this.state.variables[block.variable] -= parseInt(block.constant); break
            case 'set_var': this.state.variables[block.variable] = this.state.variables[block.variable2]; break
            case 'add_var': this.state.variables[block.variable] += this.state.variables[block.variable2]; break
            case 'sub_var': this.state.variables[block.variable] -= this.state.variables[block.variable2]; break
        }
    }

    showGameState= () => this.setState({showState: true})
    hideGameState = () => this.setState({showState: false})
    setGameState = state => this.setState(state)

    render() {
        const dirmap = {"S": "n", "SV": "ne", "V": "e", "JV": "se", "J": "s", "JZ": "sw", "Z": "w", "SZ": "nw"}
        const location = locations.getLocation(this.state.location)
        const directions = {}
        const allCommands = []

        Object.entries(location.directions).forEach(([dir, location]) => directions[dir] = () => this.moveTo(location))

        location.commands.concat(allLocations.commands)
            .filter(it => (it.block == 'command') && this.checkConditionList(it.show))
            .forEach(command => {
                const eng = dirmap[command.name]
                    if (eng) {
                        directions[eng] = () => this.executeStatement(command)
                    } else {
                        allCommands.push(command)
                    }
            })

        return (
            <Panel>
                {this.state.showState
                    ? <ShowGameState state={this.state} setGameState={this.setGameState} handleClose={this.hideGameState}/>
                    : ""
                }
                <Media>
                    <Media.Left>
                        <img src={location.image} style={{float: "left", border: "solid thin", margin: 10, width: 600}}/>
                    </Media.Left>
                    <Media.Body>
                        { this.state.delayed ? "" :
                            <div style={{float: "right"}}>
                                <Compass directions={directions}/>
                            </div>
                        }
                        <h1>{location.title}</h1>
                        <p>{location.description}</p>
                        { this.state.printed.map((it, i) => <p key={i}>{it}</p>) }
                        { this.state.delayed ? "" :
                            <div>
                                { allCommands.map(it => <Button key={it.name} onClick={() => this.executeStatement(it) }>
                                        {it.name}
                                        </Button>) }
                            </div>
                        }
                    </Media.Body>
                </Media>
            </Panel>
        )
    }
}
