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

    moveTo = (location) => {
        this.autoExecuteBlocks("on_exit")
        this.setState(
            {location: location, printed: []},
            () => this.autoExecuteBlocks("on_entry"))
    }

    print = (msg) => {
        this.state.printed.push(msg)
        this.setState({})
    }

    autoExecuteBlocks = (blockType) => {
        locations.getLocation(this.state.location).commands
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

                case 'flag_set': return this.state.flags.has(condition.flag)
                case 'flag_clear': return !this.state.flags.has(condition.flag)

                case 'compare_const': return comp(this.state.variables[action.variable], action.constant)
                case 'compare_var': return comp(this.state.variables[action.variable], this.state.variables[action.variable2])
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

    executeSequence = (blocks, autoCommand=false) => {
        const conditionalExecute = block => {
            if (this.checkConditionList(block.allow)) {
                skipElses = true
                this.executeSequence(block.statements)
            }
        }

        let skipElses = false
        if (!blocks)
            return
        for(let block of blocks) {
            switch (block.block) {
                case 'if': skipElses = false; conditionalExecute(block); break
                case 'elif': if (!skipElses) conditionalExecute(block); break
                case 'else': if (!skipElses) this.executeSequence(block.statements); break
                default: skipElses = false; this.executeBlock(block)
            }
        }
    }

    executeBlock = (block) => {
        switch (block.block) {
            case 'go': return this.moveTo(block.location)
            case 'print': return this.print(block.msg)

            case 'pick': this.state.items[block.item] = ITEM_CARRIED; break
            case 'drop': this.state.items[block.item] = this.state.location; break
            case 'item_at': this.state.items[block.item] = block.location; break
            case 'destroy': this.state.items[block.item] = ITEM_DOES_NOT_EXIST; break

            case 'set_flag': this.state.flags.add(block.flag); break
            case 'clear_flag': this.state.flags.delete(block.flag); break

            case 'set_const': this.state.variable[block.variable] = block.constant; break
            case 'increase': this.state.variable[block.variable]++; break
            case 'decrease': this.state.variable[block.variable]--; break
            case 'add_const': this.state.variable[block.variable] += block.constant; break
            case 'sum_const': this.state.variable[block.variable] -= block.constant; break
            case 'set_var': this.state.variable[block.variable] = this.state.variable[block.variable2]; break
            case 'add_var': this.state.variable[block.variable] += this.state.variable[block.variable2]; break
            case 'sub_var': this.state.variable[block.variable] -= this.state.variable[block.variable2]; break
        }
    }

    showGameState= () => this.setState({showState: true})

    hideGameState = () => this.setState({showState: false})

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
                        { this.state.printed.map((it, i) => <p key={i}>{it}</p>) }
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
                            { location.commands
                                .filter(it => (it.block == 'command') && this.checkConditionList(it.show))
                                .map(it => <Button key={it.name} onClick={() => this.executeStatement(it) }>
                                    {it.name}
                                    </Button>) }
                        </div>
                    </Media.Body>
                </Media>
            </Panel>
        )
    }
}

// TODO: Compass
// TODO: Sicerče can be inserted into Če --> check whether the connection we're connecting to is the next, not the input
//       This problem is more than mere inconvenience - children will actually make this mistake a lot