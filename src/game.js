import React from "react"
import { Panel, Button } from 'react-bootstrap'


const ITEM_CARRIED = -1
const ITEM_DOES_NOT_EXIST = -2


export default class Game extends React.Component {
    constructor(props) {
        super(props)
        this.itemNames = props.data.items
        this.flagNames = props.data.flags
        this.varNames = props.data.variables
        this.state = {
            location: 0,
            printed: [],
            items: Array(this.itemNames),
            flags: Array(this.flagNames),
            variables: Array(this.varNames),
        }
        this.locations = props.data.locations

        this.executeCommand = this.executeCommand.bind(this)
        this.moveTo = this.moveTo.bind(this)
        this.print = this.print.bind(this)
    }

    moveTo(location) {
        this.state.location = location
        this.state.printed = []
        this.setState({location, printed: []})
    }

    print(msg) {
        this.state.printed.push(msg)
        this.setState(this.state)
    }


    executeCommand(block) {
        
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

                case 'is_at': return this.state.location == condition.location

                case 'does_have': return this.state.items[condition.item] == ITEM_CARRIED
                case 'item_is_at': return this.state.items[condition.item] == condition.location
                case 'item_exists': return this.state.items[condition.item] != ITEM_DOES_NOT_EXIST
                case 'item_is_here': return this.state.items[condition.item] == this.state.location

                case 'flag_set': return this.state.flags[condition.flag]
                case 'flag_clear': return !this.state.flags[condition.flag]

                case 'compare_const': return comp(this.state.variables[action.variable], action.constant)
                case 'compare_var': return comp(this.state.variables[action.variable], this.state.variables[action.variable2])
            }
        }

        const checkConditionList = conditions => {
            if (!conditions) return true
            for (let condition of conditions) {
                if (!checkCondition(condition))
                    return condition.msg
            }
            return true
        }

        const executeAction = action => {
            switch (action.block) {
                case 'go': return this.moveTo(action.location)
                case 'print': return this.print(action.msg)

                case 'pick': this.state.items[action.item] = ITEM_CARRIED; break
                case 'drop': this.state.items[action.item] = this.state.location; break
                case 'item_at': this.state.items[action.item] = action.location; break
                case 'destroy': this.state.items[action.item] = ITEM_DOES_NOT_EXIST; break

                case 'set_flag': this.state.flags[action.flag] = true; break
                case 'clear_flag': this.state.flags[action.flag] = false; break

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

        var skipElses = false
        for (let action of block.next) {
            if ((action.block == 'action') || (action.block == 'else_action')) {
                if (!skipElses) {
                    const msg = checkConditionList(action.allow)
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
    }

    render() {
        const location = this.locations[this.state.location]

        const exits = location.commands.find(command => command.block == 'exits')
        return (
            <Panel>
                <h1>{location.title}</h1>
                <p>{location.description}</p>
                { this.state.printed.map(it => <p>{it}</p>) }
                <div>
                    { ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"].map(dir => {
                            const where = exits['exit_' + dir.toLowerCase()]
                            if (where != '') return (
                                <Button key={dir} onClick={() => this.moveTo(where)}>
                                    {dir}
                                </Button>
                            )
                        })
                    }
                </div>
                <div>
                    { location.commands
                        .filter(it => it.block == 'command')
                        .map(it => <Button key={it.name} onClick={() => this.executeCommand(it) }>
                            {it.name}
                            </Button>) }
                </div>
            </Panel>
        )
    }
}
