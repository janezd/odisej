import React from "react"
import { Panel, Button, Media, Modal, Label, FormControl, ControlLabel, DropdownButton, MenuItem, Navbar, ButtonToolbar } from 'react-bootstrap'
import blocks from "./createBlocks"
import { locations, items, flags, variables, gameSettings } from './quill'
import { systemCommandsSettings } from './creator'

const ITEM_CARRIED = -1
const ITEM_DOES_NOT_EXIST = -2



const AdderRemover = (props) => (
    <div>
        { props.model.entries()
        .filter(([id, name]) => props.selector(id))
        .map(([id, name]) =>
            <span key={id}>
                <Label bsStyle="danger" onClick={() => props.changer(id, false)}>x</Label>
                <Label bsStyle="success">{props.getName ? props.getName(id) : name}</Label>
                <span> </span>
            </span>)}
        <DropdownButton id={props.title} bsSize="xsmall" title={props.title}>
            {props.model.entries()
                .filter(([id, name]) => !props.selector(id))
                .map(([id, name]) => <MenuItem key={id} eventKey={id} onSelect={() => props.changer(id, true)}>
                        {props.getName ? props.getName(id) : name}
                    </MenuItem>)
            }
        </DropdownButton>
    </div>
)

class GameState extends React.Component {
    constructor() {
        super()
        this.changeFlag = this.changeFlag.bind(this)
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

    visitUnvisit = (id, state) => {
        const nVisits = this.props.state.nVisits
        nVisits[id] = state ? 1 : 0
        this.props.setGameState({nVisits})
    }

    render() {
        if (!this.props.show) return null

        const state = this.props.state
        return <Modal show={true} onHide={this.props.handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>
                    Stanje igre
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <dl className="dl-horizontal">
                    <dt>Trenutna lokacija:</dt>
                    <dd>
                        <DropdownButton id="current-location"
                                        bsSize="xsmall"
                                        title={locations[state.location].title}>
                            { locations.entries()
                                .filter(([it, loc]) =>
                                    !locations.isSpecial(loc))
                                .map(([it, loc]) =>
                                     <MenuItem key={it} eventKey={it} onSelect={this.setLocation}>{loc.title}</MenuItem>
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
                                {variables[id]}&nbsp;=&nbsp;
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
                    <dt>Obiskane lokacije:</dt>
                    <dd><AdderRemover title="Označi kot obiskano"
                                      model={locations}
                                      getName={loc => locations[loc].title}
                                      selector={loc => state.nVisits[loc]}
                                      changer={this.visitUnvisit}
                    /></dd>
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


const DropItemLink = ({itemState, itemId, onClick}) =>
    gameSettings.dropItems && itemState[itemId] == ITEM_CARRIED
        ? <span>&nbsp;(<a onClick={onClick}>odloži</a>)</span>
        : null

const Messages = ({messages}) =>
    messages.map((it, i) => <p key={i}>{it}</p>)


const Commands = ({show, directions, commands, systemCommands}) =>
    show ?
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
    : null


export default class Game extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            ...this.prepareInitialState(),
            showCommands: true,
            showState: false
        }
        this.currentCommand = null
        this.allowReexecute = false

        this.systemCommands = {}
        if (gameSettings.showInventory)
            this.systemCommands["Kaj imam?"] = () => this.printInventory()
    }

    prepareInitialState = () => {
        const _obj_from_keys = (obj, deflt) => {
            const res = {}
            Object.keys(obj).forEach(key => res[key] = deflt)
            return res
        }

        return {
            location: locations.startLocation,
            items: _obj_from_keys(items, ITEM_DOES_NOT_EXIST),
            flags: _obj_from_keys(flags, false),
            variables: _obj_from_keys(variables, 0),
            nVisits: _obj_from_keys(locations, 0),
            executed: {},
            printed: []
        }
    }

    saveState = () => {
        const {location, items, flags, variables, nVisits, executed} = this.state
        const blob = new Blob(
            [JSON.stringify({location, items, flags, variables, nVisits, executed})],
            { type: 'text/plain' })
        const anchor = document.createElement('a');
        anchor.download = "stanje-igre.json";
        anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
        anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':')
        anchor.click()
    }

    loadState = files => {
        const reader = new FileReader()
        reader.onload = e => this.setState(JSON.parse(e.target.result))
        reader.readAsText(files[0])
    }

    componentDidMount = () => this.autoExecuteOnStart()

    currentLocAndCommand = (commandName) => `${this.state.location}:${commandName || this.currentCommand}`

    checkConditionList = (conditions, conjunctive=true, commandName=null) => {
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

                case 'hasnt_executed': return !this.state.executed[this.currentLocAndCommand(commandName)]
                case 'is_at': return this.state.location == condition.location
                case 'has_visited': return this.state.nVisits[condition.location]

                case 'does_have': return this.state.items[condition.item] == ITEM_CARRIED
                case 'doesnt_have': return this.state.items[condition.item] != ITEM_CARRIED
                case 'can_carry_more': return this.canCarryMore()
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
            () => this.setState({location, printed: []},
                () => this.autoExecuteBlocks("on_entry",
                    () => { this.state.nVisits[location]++
                            this.setState({nVisits: this.state.nVisits}, then) }
                )
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
        this.setState(this.prepareInitialState(),
            () => this.autoExecuteOnStart(then))

    autoExecuteOnStart = then => {
        this.state.nVisits[locations.startLocation]++
        const execute = first => first
            ? this.executeSequence(first.block.next, () => execute(first.next))
            : this.autoExecuteBlocks("on_entry", then)
        const blockChain = locations
            .entries()
            .sort()  // ensure that "all locations" is executed first
            .map(([id, location]) => location)
            .reduce((chain, location) =>
                chain.concat(location.commands.filter(it => (it.block == 'on_start'))), [])
            .reduceRight((next, block) => ({next, block}), null)
        execute(blockChain)
    }

    autoExecuteBlocks = (blockType, then) => {
        const execute = first => first ? this.executeSequence(first.block.next, () => execute(first.next)) : then && then()
        const blockChain = locations[this.state.location].commands.concat(locations.generalCommands.commands)
            .filter(it => (it.block == blockType))
            .reduceRight((next, block) => ({next, block}), null)
        execute(blockChain)
    }

    executeCommand = (block, then) => {
        const endCommand = () => {
            // This must happen after the command is ran.
            // Allow re-execute block then can't have an immediate effect but must be taken into account here
            const { executed } = this.state
            if (this.allowReexecute) {
                delete this.state.executed[this.currentLocAndCommand()]
            }
            else {
                executed[this.currentLocAndCommand()] = true
            }
            this.currentCommand = null;
            this.setState({executed}, then)
        }

        this.currentCommand = block.name
        this.allowReexecute = false
        this.print(<b>&gt; {block.name}</b>,
            () => this.executeSequence(block.next,
                () => this.autoExecuteBlocks("after_command", endCommand)
            )
        )
    }


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

    numberOfCarried = () => Object.values(this.state.items).filter(val => val == ITEM_CARRIED).length
    canCarryMore = () => !gameSettings.maxItems || (this.numberOfCarried() < gameSettings.maxItems)

    moveItemOrComplain = (item, location, then) => {
        if ((location == ITEM_CARRIED) && !this.canCarryMore()) {
            this.print("Toliko pa ne morem nositi.", then)
        } else {
            this.state.items[item] = location
            this.setState({items: this.state.items}, then)
        }
    }

    executeBlock = (block, then) => {
        const { variables, flags, items, executed } = this.state
        const name = block.item || block.flag || block.variable

        const setItem = value => this.moveItemOrComplain(name, value, then)
        const setFlag = value => { flags[name] = value; this.setState({flags}, then) }
        const setVariable = value => { variables[name] = value; this.setState({variables}, then) }

        switch (block.block) {
            case 'go': return this.moveTo(block.location, then)
            case 'print': return this.printBlock(block.msg, then)
            case 'delay': return this.delay(1000 * parseInt(block.constant), then)
            case 'reset': return this.resetGame(then)

            case 'allow_reexecute': this.allowReexecute = true; return then && then()

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

            case 'set_timer': setTimeout(() => this.executeSequence(block.statements), 1000 * parseFloat(block.time)); return then && then()
        }
    }

    showGameState= () => this.setState({showState: true})
    hideGameState = () => this.setState({showState: false})
    setGameState = state => this.setState(state)

    printInventory = () => {
        const inventory = Object.entries(this.state.items)
            .filter(([id, value]) => value == ITEM_CARRIED)
        const itemList = inventory.length
            ? <span>{
                  inventory.map(([id, place], i) => {
                      const itemName = items[id]
                      return <span key={`item${i}`}>{i ? ", " : ""}{itemName}
                          <DropItemLink itemId={id}
                                        itemState={this.state.items}
                                        onClick={() => this.moveItem(id, this.state.location, `Odloži ${itemName}`)}/>
                      </span>
                  })
              }</span>
            : "Nič."
        this.print(<b>&gt; Kaj imam?</b>,
            () => this.print(itemList))
    }

    printBlock = (msg, then) => {
        const msg2 = variables.entries().reduce((m, [id, name]) => m.split(`[${name}]`).join(this.state.variables[id]), msg)
        this.print(msg2, then)
    }

    moveItem = (id, where, msg) =>
        this.print(<b>&gt; {msg}</b>,
            () => this.moveItemOrComplain(id, where,
                () => this.autoExecuteBlocks("after_command")
            )
        )

    getCommandList = () => {
        const dirmap = {"S": "n", "SV": "ne", "V": "e", "JV": "se", "J": "s", "JZ": "sw", "Z": "w", "SZ": "nw"}
        const location = locations[this.state.location]
        const directions = {}
        const commands = {}

        Object.entries(location.directions)
            .forEach(([dir, location]) => directions[dir] = () => this.moveTo(location))

        if (gameSettings.takeItems) {
            Object.entries(this.state.items)
                .filter(([id, location]) => location == this.state.location)
                .forEach(([id, location]) => {
                    const name = `Vzemi ${items[id]}`
                    commands[name] = () => this.moveItem(id, ITEM_CARRIED, name)
                })
        }
        locations.generalCommands.commands.concat(location.commands)
            .filter(command => command.block == 'command')
            .forEach(command => {
                const shown = this.checkConditionList(command.show, true, command.name)
                const callback = () => this.executeCommand(command)
                const dir = dirmap[command.name]
                if (dir) {
                    if (shown) directions[dir] = callback
                    else delete directions[dir]
                } else {
                    if (shown) commands[command.name] = callback
                    else delete commands[command.name]
                }
            })

        return [directions, commands]
    }

    render() {
        const location = locations[this.state.location]
        const [directions, commands] = this.getCommandList()
        return (
            <div>
                <Navbar>
                    <Navbar.Header>
                        <Navbar.Brand>
                            {gameSettings.gameTitle}
                        </Navbar.Brand>
                    </Navbar.Header>
                    <Navbar.Form pullRight>
                        <ButtonToolbar>
                            <Label bsStyle="success" onClick={this.saveState}>Shrani</Label>
                            <FormControl id="stateUpload" style={{display: "none"}} type="file" accept=".json"
                                         onChange={e => this.loadState(e.target.files)}/>
                            <ControlLabel htmlFor="stateUpload">
                                <Label bsStyle="success">Naloži</Label>
                            </ControlLabel>
                            <Button onClick={() => this.resetGame()}>
                                Začni znova
                            </Button>
                            { this.props.debug ?
                                <span>
                                    <Button onClick={this.showGameState}>
                                        Stanje igre
                                    </Button>
                                    <Button onClick={this.props.switchToCreate}>
                                        Ustvari
                                    </Button>
                                </span>
                                : "" }
                        </ButtonToolbar>
                    </Navbar.Form>
                </Navbar>
                <Panel>
                    <GameState show={this.state.showState} state={this.state}
                               setGameState={this.setGameState} handleClose={this.hideGameState}/>
                    <Media>
                        <Media.Left>
                            <img src={location.image} style={{float: "left", border: "solid thin", margin: 10, width: 600}}/>
                        </Media.Left>
                        <Media.Body>
                            <h1>{location.title}</h1>
                            <p>{location.description}</p>
                            <Messages messages={this.state.printed}/>
                            <Commands show={this.state.showCommands}
                                      directions={directions} commands={commands} systemCommands={this.systemCommands} />
                        </Media.Body>
                    </Media>
                </Panel>
            </div>
        )
    }
}
