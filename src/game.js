import React from "react"
import { Panel, Button, Media, Modal } from 'react-bootstrap'
import blocks from "./createBlocks"
import { locations, items, flags, variables, restoreLocally, storeLocally, packBlockArgs } from './quill'


const ITEM_CARRIED = -1
const ITEM_DOES_NOT_EXIST = -2



class ShowGameState extends React.Component {
    render() {
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
                    <dd>{locations.getLocation(state.location).title}</dd>

                    <dt>Zastavice:</dt>
                    <dd>{[...state.flags.values()]
                        .map(it => flags.getNameById(it))
                        .join(", ")
                        || "(ni zastavic)"}</dd>

                    <dt>Igralec ima:</dt>
                    <dd>{[...Object.entries(state.items)]
                        .filter(it => it[1] == ITEM_CARRIED)
                        .map(it => items.getNameById(it[0]))
                        .join(", ")
                        || "(nič)"}</dd>

                    <dt>Ostale stvari:</dt>
                    <dd>{[...Object.entries(state.items)]
                        .filter(it => (it[1] != ITEM_DOES_NOT_EXIST) && (it[1] != ITEM_CARRIED))
                        .map(it => `${items.getNameById(it[0])} -> ${locations.getLocation(it[1]).title}`)
                        .join(", ")
                        || "(ničesar ni)"}</dd>

                    <dt>Spremenljivke:</dt>
                    <dd>{[...Object.entries(state.variables)]
                        .map(it => `${variables.getNameById(it[0])}=${it[1]}`)
                        .join(", ")
                        || "(ni spremenljivk)"}</dd>
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
            flags: new Set(),
            variables: this._obj_from_keys(variables.getIds()),
            showState: false
        }
    }

    _obj_from_keys = (keys, deflt=0) => {
        const res = {}
        keys.forEach(key => res[key] = deflt)
        return res
    }

    autoExecuteBlocks = (blockType) => {
        locations.getLocation(this.state.location).commands
            .filter(it => (it.block == blockType))
            .forEach(it => this.executeCommand(it, true))
    }

    moveTo = (location) => {
        this.autoExecuteBlocks("on_exit")
        this.setState(
            {location: location, printed: []},
            () => this.autoExecuteBlocks("on_entry"))
    }

    print = (msg) => {
        this.state.printed.push(msg)
        this.setState(this.state)
    }

    showGameState= () => this.setState({showState: true})

    hideGameState = () => this.setState({showState: false})

    checkConditionList = conditions => {
        const checkCondition = condition => {
            switch (condition.block) {
                case 'not': return !checkCondition(condition.not)

                case 'is_at': return this.state.location == condition.location

                case 'does_have': return this.state.items[condition.item] == ITEM_CARRIED
                case 'item_is_at': return this.state.items[condition.item] == condition.location
                case 'item_exists': return this.state.items[condition.item] != ITEM_DOES_NOT_EXIST
                case 'item_is_here': return this.state.items[condition.item] == this.state.location

                case 'flag_set': return this.state.flags.has(condition.flag)
                case 'flag_clear': return !this.state.flags.has(condition.flag)

                case 'compare_const': return comp(this.state.variables[action.variable], action.constant)
                case 'compare_var': return comp(this.state.variables[action.variable], this.state.variables[action.variable2])
            }
        }

        if (!conditions) return true
        for (let condition of conditions) {
            if (!checkCondition(condition))
                return condition.msg
        }
        return true
    }


    executeCommand = (block, autoCommand=false) => {
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

        const executeAction = action => {
            switch (action.block) {
                case 'go': return this.moveTo(action.location)
                case 'print': return this.print(action.msg)

                case 'pick': this.state.items[action.item] = ITEM_CARRIED; break
                case 'drop': this.state.items[action.item] = this.state.location; break
                case 'item_at': this.state.items[action.item] = action.location; break
                case 'destroy': this.state.items[action.item] = ITEM_DOES_NOT_EXIST; break

                case 'set_flag': this.state.flags.add(action.flag); break
                case 'clear_flag': this.state.flags.delete(action.flag); break

                case 'set_const': this.state.variable[action.variable] = action.constant; break
                case 'increase': this.state.variable[action.variable]++; break
                case 'decrease': this.state.variable[action.variable]--; break
                case 'add_const': this.state.variable[action.variable] += action.constant; break
                case 'sum_const': this.state.variable[action.variable] -= action.constant; break
                case 'set_var': this.state.variable[action.variable] = this.state.variable[action.variable2]; break
                case 'add_var': this.state.variable[action.variable] += this.state.variable[action.variable2]; break
                case 'sub_var': this.state.variable[action.variable] -= this.state.variable[action.variable2]; break
            }
            this.setState(this.state)
        }

        const executeActionList = actions => {
            actions.forEach(executeAction)
        }

        if (!autoCommand) {
            this.print(<b>&gt; {block.name}</b>)
        }

        var skipElses = false
        for (let action of block.next) {
            if ((action.block == 'action') || (action.block == 'else_action')) {
                if (!skipElses) {
                    const msg = this.checkConditionList(action.allow)
                    if (msg === true) {
                        executeActionList(action.statements)
                        skipElses = true
                    }
                    else if (msg) {
                        this.print(msg)
                    }
                }
            }
            else {
                executeAction(action)
                skipElses = false
            }
        }
        this.autoExecuteBlocks("after_command")
    }

    render() {
        const dirmap = {"S": "n", "SV": "ne", "V": "e",
                        "JV": "se", "J": "s", "JZ": "sw", "Z": "w", "SZ": "nw"}
        const location = locations.getLocation(this.state.location)

        return (
            <Panel>
                {this.state.showState
                    ? <ShowGameState state={this.state} handleClose={this.hideGameState}/>
                    : ""
                }
                <Media>
                    <Media.Left>
                        <img src={location.image} style={{float: "left", border: "solid thin", margin: 10}}/>
                    </Media.Left>
                    <Media.Body>
                        <h1>{location.title}</h1>

                        <p>{location.description}</p>
                        { this.state.printed.map(it => <p>{it}</p>) }
                        <div>
                            { ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"].map(dir => {
                                    const where = location.directions[dirmap[dir]]
                                    if (where) return (
                                        <Button key={dir} onClick={() => this.moveTo(where)}>
                                            {dir}
                                        </Button>
                                    )
                                })
                            }
                        </div>
                        <div>
                            { location.commands
                                .filter(it => (it.block == 'command') && (this.checkConditionList(it.show) === true))
                                .map(it => <Button key={it.name} onClick={() => this.executeCommand(it) }>
                                    {it.name}
                                    </Button>) }
                        </div>
                    </Media.Body>
                </Media>
            </Panel>
        )
    }
}
