import React from "react"
import { Panel, Button, Media, Modal, Label, FormControl, ControlLabel, DropdownButton, MenuItem } from 'react-bootstrap'
import blocks from "./createBlocks"
import { locations, items, flags, variables, allLocations, restoreLocally, storeLocally, packBlockArgs } from './quill'

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


const Compass = ({directions}) => {
    const Direction = ({dir}) => {
        const dirmap = {"n": "S", "ne": "SV", "e": "V", "se": "JV", "s": "J", "sw": "JZ", "w": "Z", "nw": "SZ"}
        const command = directions[dir]
        if (command)
            return <td><Button style={{width: 60}} onClick={command}>{dirmap[dir]}</Button></td>
        else
            return <td><Button style={{width: 60}}>&nbsp;</Button></td>
    }

    return <table>
        <tbody>
        <tr>
            <Direction dir="nw"/>
            <Direction dir="n"/>
            <Direction dir="ne"/>
        </tr>
        <tr>
            <Direction dir="w"/>
            <td/>
            <Direction dir="e"/>
        </tr>
        <tr>
            <Direction dir="sw"/>
            <Direction dir="s"/>
            <Direction dir="se"/>
        </tr>
        </tbody>
    </table>
}


const Commands = ({directions, commands, systemCommands}) =>
    <div>
        <div style={{float: "left", marginRight: 30}}>
            <Compass directions={directions}/>
        </div>
        <div>
            { Object.entries(commands).map(
                ([name, callback]) => <Button key={name} onClick={callback}>{name}</Button>) }
        </div>
        <div style={{marginTop: 20}}>
            { Object.entries(systemCommands).map(
                ([name, callback]) => <Button key={name} onClick={callback}>{name}</Button>) }
        </div>
    </div>


export default class Game extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            ...this.prepareInitialState(),
            showCommands: true,
            showState: false
        }
    }

    prepareInitialState = () => {
        const _obj_from_keys = (keys, deflt=0) => {
            const res = {}
            keys.forEach(key => res[key] = deflt)
            return res
        }

        return {
            location: locations.startLocation,
            items: _obj_from_keys(items.getIds(), ITEM_DOES_NOT_EXIST),
            flags: _obj_from_keys(flags.getIds()),
            variables: _obj_from_keys(variables.getIds()),
            printed: []
        }
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

    moveTo = (location, then) =>
        this.autoExecuteBlocks("on_exit",
            () => this.setState({location: location, printed: []},
                () => this.autoExecuteBlocks("on_entry", then)
            )
        )

    print = (msg, then) =>
        this.setState({printed: this.state.printed.concat([msg])}, then)

    delay = (ms, then) =>
        this.setState({showCommands: false},
            () => setTimeout(
                () => this.setState({showCommands: true}, then),
                ms
            )
        )

    resetGame = (then) =>
        this.setState(this.prepareInitialState(), then)

    autoExecuteBlocks = (blockType, then) => {
        const execute = (first) => first ? this.executeSequence(first.block.next, () => execute(first.next)) : then && then()
        const blockChain = locations.getLocation(this.state.location).commands.concat(allLocations.commands)
            .filter(it => (it.block == blockType))
            .reduceRight((next, block) => ({next, block}), null)
        execute(blockChain)
    }

    executeCommand = (block, then) =>
        this.print(<b>&gt; {block.name}</b>,
            () => this.executeSequence(block.next,
                () => this.autoExecuteBlocks("after_command", then)
            )
        )

    executeSequence = (block, then, skipElses=false) => {
        if (!block)
            return then && then()
        const executeNextBlock = (nextSkipElses=false) => (() => this.executeSequence(block.next, then, nextSkipElses))
        switch (block.block) {
            case 'elif':
                return !skipElses && this.checkConditionList(block.allow)
                    ? this.executeSequence(block.statements, executeNextBlock(true))
                    : executeNextBlock(skipElses)()
            case 'if':
                return this.checkConditionList(block.allow)
                    ? this.executeSequence(block.statements, executeNextBlock(true))
                    : executeNextBlock()()
            case 'else':
                return !skipElses
                    ? this.executeSequence(block.statements, executeNextBlock())
                    : executeNextBlock()()
            default:
                return this.executeBlock(block, executeNextBlock())
        }
    }

    executeBlock = (block, then) => {
        const { variables, flags, items } = this.state
        const name = block.item || block.flag || block.variable
        const setItem = value => { items[name] = value; this.setState({items}, then) }
        const setFlag = value => { flags[name] = value; this.setState({flags}, then) }
        const setVariable = value => { variables[name] = value; this.setState({variables}, then) }

        switch (block.block) {
            case 'go': return this.moveTo(block.location, then)
            case 'print': return this.print(block.msg, then)
            case 'delay': return this.delay(1000 * parseInt(block.constant), then)
            case 'reset': return this.resetGame(then)

            case 'pick': return setItem(ITEM_CARRIED)
            case 'drop': return setItem(this.state.location)
            case 'item_at': return setItem(block.location)
            case 'destroy': return setItem(ITEM_DOES_NOT_EXIST)

            case 'set_flag': return setFlag(true)
            case 'clear_flag': return setFlag(false)

            case 'set_const': return setVariable(parseInt(block.constant))
            case 'set_var': return setVariable(variables[block.variable2])
            case 'increase': return setVariable(variables[name] + 1)
            case 'decrease': return setVariable(variables[name] - 1)
            case 'add_const': return setVariable(variables[name] + parseInt(block.constant))
            case 'sub_const': return setVariable(variables[name] - parseInt(block.constant))
            case 'add_var': return setVariable(variables[name] + variables[block.variable2])
            case 'sub_var': return setVariable(variables[name] - variables[block.variable2])
        }
    }

    showGameState= () => this.setState({showState: true})
    hideGameState = () => this.setState({showState: false})
    setGameState = state => this.setState(state)

    printInventory = () => {
        this.print(<b>&gt; Kaj imam?</b>,
            () => this.print(
                Object.entries(this.state.items)
                    .filter(([id, value]) => value == ITEM_CARRIED)
                    .map(([id, value]) => items.getNameById(id))
                    .join(", ")
                || "Nič.")
        )
    }

    render() {
        const dirmap = {"S": "n", "SV": "ne", "V": "e", "JV": "se", "J": "s", "JZ": "sw", "Z": "w", "SZ": "nw"}
        const location = locations.getLocation(this.state.location)
        const directions = {}
        const otherCommands = {}
        const systemCommands = {"Začni znova": () => this.resetGame(), "Kaj imam?": () => this.printInventory() }

        Object.entries(location.directions).forEach(([dir, location]) => directions[dir] = () => this.moveTo(location))

        location.commands.concat(allLocations.commands)
            .filter(it => (it.block == 'command') && this.checkConditionList(it.show))
            .forEach(command => {
                const eng = dirmap[command.name]
                const callback = () => this.executeCommand(command)
                    if (eng) {
                        directions[eng] = callback
                    } else {
                        otherCommands[command.name] = callback
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
                        <h1>{location.title}</h1>
                        <p>{location.description}</p>
                        { this.state.printed.map((it, i) => <p key={i}>{it}</p>) }
                        { this.state.showCommands ? <Commands directions={directions} commands={otherCommands} systemCommands={systemCommands} /> : ""}
                    </Media.Body>
                </Media>
            </Panel>
        )
    }
}
