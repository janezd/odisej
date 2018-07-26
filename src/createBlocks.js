import Blockly from 'node-blockly/browser'

import _ from '../translations/translator'
import { locations, items, variables, flags } from './quill'

const blocks = []

function appendBlock(category, block_name, block) {
    for(let definition of blocks) {
        if ((definition.category == category) && (definition.name == block_name)) {
            definition.block = block
            return
        }
    }
    blocks.push({category, name: block_name, block})
}

function cleanUp(block, namePrefix, firstLine, conjunction, beforeInput=null, noFirstIfMoreLines=false) {
    const conditions = block.conditions
    const lastConnection = (conditions.length > 0) ? conditions[conditions.length - 1].connection : false
    if ((lastConnection === false)
            || ((lastConnection != null) && (lastConnection.isConnected()))) {
        const newInput = block.appendValueInput("TEMP")
            .appendField(conjunction)
            .setAlign(Blockly.ALIGN_RIGHT)
            .setCheck(['Boolean'])
        conditions.push(newInput)
        if (beforeInput != null) {
            block.moveInputBefore("TEMP", beforeInput)
        }
    }
    for(let i = 0; i < conditions.length - 1;) {
        if (!conditions[i].connection.isConnected()) {
            block.removeInput(conditions[i].name)
            conditions.splice(i, 1)
        }
        else {
            i++
        }
    }
    for(let i in conditions) {
        conditions[i].name = namePrefix + i
    }
    conditions[0].fieldRow[0].setText(conditions.length == 1 || !noFirstIfMoreLines ? firstLine : "")
    conditions[0].setAlign(Blockly.ALIGN_LEFT)
}

function mutate(block, xml, namePrefix, firstLine, conjunction, beforeInput=null, noFirstIfMoreLines=false) {
    const numVals = parseInt(xml.getAttribute("nconditions"))
    const conditions = block.conditions
    if (numVals < conditions.length) {
        for(let i = numVals; i < conditions.length; i++) {
            block.removeInput(`${namePrefix}${i}`)
        }
        conditions.splice(numVals)
    }
    else {
        for(let i = conditions.length; i < numVals; i++) {
            const name = `${namePrefix}${i}`
            const newInput = block.appendValueInput(name)
                .appendField(!i ? firstLine : conjunction)
                .setAlign(!i ? Blockly.ALIGN_LEFT : Blockly.ALIGN_RIGHT)
                .setCheck(['Boolean'])
            conditions.push(newInput)
            if (beforeInput != null) {
                block.moveInputBefore(name, beforeInput)
            }
        }
    }
    conditions[0].fieldRow[0].setText(conditions.length == 1 || !noFirstIfMoreLines ? firstLine : "")
}


export function refreshDropdowns(id, newName) {
    Blockly.getMainWorkspace().getAllBlocks().forEach(block =>
        block.inputList
            .filter(input => input.type == Blockly.DUMMY_INPUT)
            .forEach(input =>
                input.fieldRow.forEach(field => {
                    if (field.name && (field.getValue() == id))
                        field.setText(newName)
                })
            )
    )
}


class FieldItems extends Blockly.FieldDropdown {
    constructor(nameModel, flyOutMsg, addMsg) {
        super(() => {
            if (!this || this.inFlyout)
                return [[flyOutMsg, "ADD"]]
            const options = [...nameModel.entries().map(([id, name]) => [name, id]).sort(), [addMsg, "ADD"]]
            if (options.length > 1) {
                options.push([_("Rename ..."), "RENAME"])
            }
            return options
        })
        this.nameModel = nameModel
        this.inFlyOut = false
    }

    onItemSelected(menu, menuItem) {
        var id = menuItem.getValue()
        const model = this.nameModel
        const self = this
        if (id == "ADD") {
            Blockly.prompt(_("Name:"), "", (name) => {
                const newItemId = model.add(name)
                self.setValue(`${newItemId}`)
            })
        }
        else if (id == "RENAME") {
            const curId = this.getValue()
            if (curId == "ADD")
                return
            const curName = this.getText()
            Blockly.prompt(_(`New name for ${curName}:`), curName, (newName) => {
                model.rename(curId, newName)
                refreshDropdowns(curId, newName)
            })
        }
        else {
            this.setValue(id)
        }
    }

    setSourceBlock(block) {
        super.setSourceBlock(block)
        this.inFlyOut = block.isInFlyout
    }
}


function createField(fieldName, placeholder=null) {
    if (fieldName.startsWith("LOCATION"))
        return new Blockly.FieldDropdown(
            () => locations.entries()
                .filter(([id, loc]) => !locations.isSpecial(loc))
                .map(([id, loc]) => [loc.title, id])
                .sort()
        )
    if (fieldName.startsWith("ITEM")) return new FieldItems(items, _("Item ..."), _("New item ..."))
    if (fieldName.startsWith("VARIABLE")) return new FieldItems(variables, _("Variable ..."), _("New variable ..."))
    if (fieldName.startsWith("FLAG")) return new FieldItems(flags, _("Flag ..."), _("New flag ..."))
    return new Blockly.FieldTextInput(placeholder || _("text"))
}


function createCondition(category, block_name, condField, fieldName, other=null, placeholder=null) {
    appendBlock(category, block_name, {
        init() {
            this.setInputsInline(false)
            const row = this.appendDummyInput()
                .appendField(condField)
            if (fieldName) {
                row.appendField(createField(fieldName, placeholder), fieldName)
            }
            if (other != null) {
                other(row, this)
            }
            this.setOutput(true, "Boolean")
            this.setColour(246)
        },
    })
}


function createStatement(category, block_name, statement, fieldName=null, other=null, placeholder=null) {
    appendBlock(category, block_name, {
      init() {
          this.setInputsInline(false)
          const row = this.appendDummyInput()
          row.appendField(statement)
          if (fieldName) {
              row.appendField(createField(fieldName, placeholder), fieldName)
          }
          if (other != null) {
              other(row, this)
          }
          this.setPreviousStatement(true)
          this.setNextStatement(true)
          this.setColour(186)
      }
    })
}


function createVarStatement(block_name, statement, fieldName, relation=null, fieldName2=null, other=null) {
    appendBlock(_("Variables"), block_name, {
        init() {
            this.setInputsInline(false)
            var t = this.appendDummyInput()
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField(statement)
                .appendField(createField(fieldName), fieldName)
            if (fieldName2 != null) {
                t = this.appendDummyInput()
                    .setAlign(Blockly.ALIGN_RIGHT)
            }
            if (relation != null) {
                t.appendField(relation)
            }
            if (fieldName2 != null) {
                t.appendField(createField(fieldName2, "vrednost"), fieldName2)
            }
            if (other != null) {
                other(this)
            }
            this.setPreviousStatement(true)
            this.setNextStatement(true)
            this.setColour(186)
        }
    })
}


export function createBlocks() {
    blocks.length = 0

    // Commands
    function createTopBlock(block_name, name, other = null) {
        appendBlock(_("Commands"), block_name, {
            init() {
                this.appendDummyInput().appendField(name)
                this.setColour(36)
                this.setNextStatement(true)
            }
        })
    }

    appendBlock(_('Commands'), 'command', {
        init() {
            this.appendDummyInput()
                .appendField(_("Command"))
                .appendField(new Blockly.FieldTextInput(_("name")), "NAME")
            const showInput = this.appendValueInput('SHOW0')
                .appendField(_('show if'))
                .setCheck('Boolean')
            this.conditions = [showInput]
            this.setColour(36)
            this.setNextStatement(true)
            this.setOnChange(() => cleanUp(this, "SHOW", _("show if"), _("and")))
        },

        mutationToDom() {
            const container = document.createElement('mutation')
            container.setAttribute('nconditions', this.conditions.length)
            return container
        },

        domToMutation(xml) {
            mutate(this, xml, "SHOW", _("show if"), _("and"))
        }
    })

    createCondition(_("Commands"), 'hasnt_executed', _("this command hasn't ran before"))

    createStatement(_("Commands"), "print", _("print"), "MSG")
    createStatement(_("Commands"), "go", _("go to"), "LOCATION")
    createStatement(_("Commands"), "delay", _("wait"), "CONSTANT", row => row.appendField("s"), "1")
    createStatement(_("Commands"), "reset", _("end of game"))

    appendBlock(_('Commands'), 'set_timer', {
        init() {
            this.appendDummyInput()
                .appendField(_("after"))
                .appendField(new Blockly.FieldTextInput("5"), "TIME")
                .appendField(_("seconds"))
            this.appendStatementInput('STATEMENTS')
            this.setColour(186)
            this.setPreviousStatement(true)
            this.setNextStatement(true)
        }
    })

    createStatement(_("Commands"), "allow_reexecute", _("allow running this command again"))

    createTopBlock('on_entry', _('On entry'))
    createTopBlock('on_exit', _('On exit'))
    createTopBlock('after_command', _('After every command'))
    createTopBlock('on_start', _('When game starts'))


    // Conditions


    const postCondition = (otherConnection) =>
        (otherConnection.sourceBlock_.type == 'if') || (otherConnection.sourceBlock_.type == 'elif')

    function createIfElif(block_name, field_name, prevCheck) {
        appendBlock(_('Conditions'), block_name, {
            init() {
                const condition = this.appendValueInput('ALLOW0')
                    .appendField(field_name)
                    .setCheck(['Boolean'])
                this.conditions = [condition]

                this.appendStatementInput('STATEMENTS')
                    .appendField(_('do'))
                this.setColour(36)
                this.setPreviousStatement(true)
                if (prevCheck) {
                    this.previousConnection.checkType_ = postCondition
                }
                this.setNextStatement(true)
                this.setOnChange(this.onChange.bind(this))
            },

            onChange() {
                cleanUp(this, "ALLOW", field_name, _("and"), "STATEMENTS")
            },

            domToMutation(xml) {
                mutate(this, xml, "ALLOW", field_name, _("and"), "STATEMENTS")
            },

            mutationToDom() {
                const container = document.createElement('mutation')
                container.setAttribute('nconditions', this.conditions.length)
                return container
            }
        })
    }

    createIfElif('if', _('if'), false)
    createIfElif('elif', _('else if'), true)

    appendBlock(_('Conditions'), 'else', {
        init() {
            this.appendStatementInput('STATEMENTS')
                .appendField(_('else'))
            this.setColour(36)
            this.setPreviousStatement(true)
            this.previousConnection.checkType_ = postCondition
            this.setNextStatement(true)
        }
    })

    createCondition(_("Conditions"), 'random', _("random number from 0 to 100 is below"), "CONSTANT", null, "50")

    appendBlock(_("Conditions"), "disjunction", {
        init() {
            const condition = this.appendValueInput('ALLOW0')
                .appendField(_("any of the following"))
                .setCheck(['Boolean'])
            this.conditions = [condition]
            this.setOutput(true, "Boolean")
            this.setColour(246)
            this.setOnChange(this.onChange.bind(this))
        },

        onChange() {
            cleanUp(this, "ALLOW", _("any of the following"), _("or"), null, true)
        },

        domToMutation(xml) {
            mutate(this, xml, "ALLOW", _("any of the following"), _("or"), null, true)
        },

        mutationToDom() {
            const container = document.createElement('mutation')
            container.setAttribute('nconditions', this.conditions.length)
            return container
        }
    })

    appendBlock(_("Conditions"), "not", {
        init() {
            this.appendValueInput("NOT")
                .appendField(_("not"))
                .setCheck("Boolean")
            this.setOutput(true, "Boolean")
            this.setColour(246)
        }
    })

    createCondition(_("Conditions"), 'has_visited', _("player visited"), "LOCATION")
    createCondition(_("Conditions"), 'is_at', _("player is at"), "LOCATION")


    // Items

    createCondition(_("Items"), 'does_have', _("player has"), "ITEM")
    createCondition(_("Items"), 'doesnt_have', _("player doesn't have"), "ITEM")
    createStatement(_("Items"), "pick", _("get"), "ITEM")
    createStatement(_("Items"), "drop", _("drop"), "ITEM")
    createStatement(_("Items"), "destroy", _("destroy"), "ITEM")
    createStatement(_("Items"), "item_at", _("put"), "ITEM",
        row => row.appendField(_("to@@item_at")).appendField(createField("LOCATION"), "LOCATION"))

    createCondition(_("Items"), 'item_is_here', _("item@@item_is_here"), "ITEM", row => row.appendField(_("is here@@item_is_here")))
    createCondition(_("Items"), 'item_is_at', _("item@@item_is_at"), "ITEM", row => row.appendField(_("is at@@item_is_at")).appendField(createField('LOCATION'), "LOCATION"))
    createCondition(_("Items"), 'item_exists', _("item@@item_exists"), "ITEM", row => row.appendField(_("exists@@item_exists")))
    createCondition(_("Items"), 'can_carry_more', _("can carry more"))


    // Flags

    createCondition(_("Flags"), 'flag_set', _("flag"), "FLAG", row => row.appendField(_("is set")))
    createCondition(_("Flags"), 'flag_clear', _("flag"), "FLAG", row => row.appendField("is not set"))
    createStatement(_("Flags"), "set_flag", _("set"), "FLAG")
    createStatement(_("Flags"), "clear_flag", _("clear"), "FLAG")


    // Variables

    createVarStatement("set_const", _("set"), "VARIABLE", _("to"), "CONSTANT")
    createVarStatement("increase", _("increase"), "VARIABLE")
    createVarStatement("decrease", _("decrease"), "VARIABLE")
    createVarStatement("add_const", _("increase"), "VARIABLE", _("by"), "CONSTANT")
    createVarStatement("sub_const", _("decrease"), "VARIABLE", _("by"), "CONSTANT")
    createVarStatement("set_var", _("set"), "VARIABLE", _("to"), "VARIABLE2")
    createVarStatement("add_var", _("increase"), "VARIABLE", _("by"), "VARIABLE2")
    createVarStatement("sub_var", _("decrease"), "VARIABLE", _("by"), "VARIABLE2")

    const _operators = [["=", "EQ"], ["≠", "NE"], ["<", "LT"], [">", "GT"], ["≤", "LE"], ["≥", "GE"]]

    createCondition(_('Variables'), 'compare_const', "", "VARIABLE",
        (row, block) => block.appendDummyInput().setAlign(Blockly.ALIGN_RIGHT)
            .appendField(new Blockly.FieldDropdown(_operators), "OPERATOR")
            .appendField(new Blockly.FieldTextInput(_('value')), "CONSTANT"),
        _("Variables"))


    createCondition(_('Variables'), 'compare_var', "", "VARIABLE",
        (row, block) => block.appendDummyInput()
            .appendField(new Blockly.FieldDropdown(_operators), "OPERATOR")
            .appendField(createField("VARIABLE2"), "VARIABLE2"),
        _("Variables"))
}

createBlocks()

export default blocks
