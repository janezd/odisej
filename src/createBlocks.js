import Blockly from 'node-blockly/browser'

import { locations, items, variables, flags } from './quill'


const blocks = []

function appendBlock(category, block_name, block) {
    blocks.push({category: category, name: block_name, block: block})
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


class FieldItems extends Blockly.FieldDropdown {
    constructor(nameModel, flyOutMsg, addMsg) {
        super(() => {
            if (!this || this.inFlyout)
                return [[flyOutMsg, "ADD"]]
            const options = [...nameModel.getNamesIds(), [addMsg, "ADD"]]
            if (options.length > 1) {
                options.push(["Preimenuj...", "RENAME"])
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
            Blockly.prompt("Ime:", "", (name) => {
                const newItemId = model.add(name)
                self.setValue(`${newItemId}`)
            })
        }
        else if (id == "RENAME") {
            const curId = this.getValue()
            const curName = this.getText()
            Blockly.prompt(`Novo ime za ${curName}:`, curName, (newName) => {
                model.rename(curId, newName)
                this.setValue(curId)
                this.setText(newName)
            })
        }
        else {
            this.setValue(id)
        }
    }

    fixMissingName() {
        if (this.nameModel.getNameById(this.getValue()) == null) {
            this.setValue("ADD")
        }
    }

    setSourceBlock(block) {
        super.setSourceBlock(block)
        this.inFlyOut = block.isInFlyout
    }
}


function createField(fieldName, placeholder=null) {
    if (fieldName.startsWith("LOCATION")) return new Blockly.FieldDropdown(locations.getNamesIds.bind(locations))
    if (fieldName.startsWith("ITEM")) return new FieldItems(items, "Stvar ...", "Nova stvar ...")
    if (fieldName.startsWith("VARIABLE")) return new FieldItems(variables, "Spremenljivka ...", "Nova spremenljivka ...")
    if (fieldName.startsWith("FLAG")) return new FieldItems(flags, "Zastavica ...", "Nova zastavica ...")
    return new Blockly.FieldTextInput(placeholder || "besedilo")
}


appendBlock('Ukazi', 'command', {
    init() {
        this.appendDummyInput()
            .appendField("Ukaz")
            .appendField(new Blockly.FieldTextInput("ime"), "NAME")
        const showInput = this.appendValueInput('SHOW0')
            .appendField('pokaži, če')
            .setCheck('Boolean')
        this.conditions = [showInput]
        this.setColour(36)
        this.setNextStatement(true, 'Akcija')
        this.setOnChange(() => cleanUp(this, "SHOW", "pokaži, če", "in hkrati"))
    },

    mutationToDom() {
        const container = document.createElement('mutation')
        container.setAttribute('nconditions', this.conditions.length)
        return container
    },

    domToMutation(xml) {
        mutate(this, xml, "SHOW", "pokaži, če", "in hkrati")
    }
})

function createTopBlock(block_name, name, other=null) {
    appendBlock("Ukazi", block_name, {
        init() {
          this.appendDummyInput().appendField(name)
          this.setColour(36)
          this.setNextStatement(true)
        }
    })
}

createTopBlock('on_entry', 'Ob vstopu')
createTopBlock('on_exit', 'Ob izstopu')
createTopBlock('after_command', 'Po ukazu')


const postCondition = (otherConnection) =>
    (otherConnection.sourceBlock_.type == 'if') || (otherConnection.sourceBlock_.type == 'elif')

function createIfElif(block_name, field_name, prevCheck) {
    appendBlock('Pogoji', block_name, {
        init() {
            const condition = this.appendValueInput('ALLOW0')
                .appendField(field_name)
                .setCheck(['Boolean'])
            this.conditions = [condition]

            this.appendStatementInput('STATEMENTS')
                .appendField('izvedi')
            this.setColour(36)
            this.setPreviousStatement(true)
            if (prevCheck) {
                this.previousConnection.checkType_ = postCondition
            }
            this.setNextStatement(true)
            this.setOnChange(this.onChange.bind(this))
        },

        onChange() {
            cleanUp(this, "ALLOW", field_name, "in hkrati", "STATEMENTS")
        },

        domToMutation(xml) {
            mutate(this, xml, "ALLOW", field_name, "in hkrati", "STATEMENTS")
        },

        mutationToDom() {
            const container = document.createElement('mutation')
            container.setAttribute('nconditions', this.conditions.length)
            return container
        }
    })
}

createIfElif('if', 'če', false)
createIfElif('elif', 'sicer če', true)

appendBlock('Pogoji', 'else', {
    init() {
        this.appendStatementInput('STATEMENTS')
            .appendField('sicer')
        this.setColour(36)
        this.setPreviousStatement(true)
        this.previousConnection.checkType_ = postCondition
        this.setNextStatement(true)
    }
})


function createCondition(category, block_name, condField, fieldName, other=null, placeholder=null) {
    appendBlock(category, block_name, {
      init() {
          this.setInputsInline(false)
          const row = this.appendDummyInput()
            .appendField(condField)
            .appendField(createField(fieldName, placeholder), fieldName)
          if (other != null) {
              other(row, this)
          }
          this.setOutput(true, "Boolean")
          this.setColour(246)
      },
    })
}

appendBlock("Pogoji", "not", {
    init() {
        this.appendValueInput("NOT")
            .appendField("ni res, da")
            .setCheck("Boolean")
        this.setOutput(true, "Boolean")
        this.setColour(246)
    }
})

appendBlock("Pogoji", "disjunction", {
    init() {
        const condition = this.appendValueInput('ALLOW0')
            .appendField("drži nekaj od tega")
            .setCheck(['Boolean'])
        this.conditions = [condition]
        this.setOutput(true, "Boolean")
        this.setColour(246)
        this.setOnChange(this.onChange.bind(this))
    },

    onChange() {
        cleanUp(this, "ALLOW", "drži nekaj od tega", "ali", null, true)
    },

    domToMutation(xml) {
        mutate(this, xml, "ALLOW", "drži nekaj od tega", "ali", null, true)
    },

    mutationToDom() {
        const container = document.createElement('mutation')
        container.setAttribute('nconditions', this.conditions.length)
        return container
    }
})



createCondition('Stvari', 'does_have', "ima igralec", "ITEM")
// createCondition('has_visited', "je igralec obiskal", "LOCATION")
createCondition('Pogoji', 'is_at', "je igralec na", "LOCATION")
createCondition('Stvari', 'item_is_at', "je", "ITEM", row => row.appendField("na").appendField(createField('LOCATION'), "LOCATION"))
createCondition('Stvari', 'item_exists', "", "ITEM", row => row.appendField("obstaja"))
createCondition('Stvari', 'item_is_here', "je", "ITEM", row => row.appendField("tukaj"))
createCondition('Zastavice', 'flag_set', "", "FLAG", row => row.appendField("je postavljena"))
createCondition('Zastavice', 'flag_clear', "", "FLAG", row => row.appendField("ni postavljena"))
createCondition('Pogoji', 'random', "žreb od 0 do 100 je večji od", "CONSTANT", null, "50")

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


createStatement("Ukazi", "go", "pojdi na", "LOCATION")
createStatement("Stvari", "pick", "vzemi", "ITEM")
createStatement("Stvari", "drop", "spusti", "ITEM")
createStatement("Stvari", "item_at", "postavi", "ITEM",
    row => row.appendField("na").appendField(createField("LOCATION"), "LOCATION"))
createStatement("Stvari", "destroy", "uniči", "ITEM")
createStatement("Zastavice", "set_flag", "postavi", "FLAG")
createStatement("Zastavice", "clear_flag", "pobriši", "FLAG")
createStatement("Ukazi", "print", "izpiši", "MSG")
createStatement("Ukazi", "delay", "počakaj", "CONSTANT", row => row.appendField("s"), "1")
createStatement("Ukazi", "reset", "ponovno začni igro")


function createVarStatement(block_name, statement, fieldName, relation=null, fieldName2=null, other=null) {
    appendBlock("Spremenljivke", block_name, {
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

createVarStatement("set_const", "postavi", "VARIABLE", "na", "CONSTANT")
createVarStatement("increase", "povečaj", "VARIABLE")
createVarStatement("decrease", "zmanjšaj", "VARIABLE")
createVarStatement("add_const", "povečaj", "VARIABLE", "za", "CONSTANT")
createVarStatement("sub_const", "zmanjšaj", "VARIABLE", "za", "CONSTANT")
createVarStatement("set_var", "postavi", "VARIABLE", "na", "VARIABLE2")
createVarStatement("add_var", "povečaj", "VARIABLE", "za", "VARIABLE2")
createVarStatement("sub_var", "zmanjšaj", "VARIABLE", "za", "VARIABLE2")

const _operators = [["=", "EQ"], ["≠", "NE"], ["<", "LT"], [">", "GT"], ["≤", "LE"], ["≥", "GE"]]

createCondition('Spremenljivke', 'compare_const', "", "VARIABLE",
    (_, block) => block.appendDummyInput().setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldDropdown(_operators), "OPERATOR")
        .appendField(new Blockly.FieldTextInput('vrednost'), "CONSTANT"),
    "Spremenljivke")


createCondition('Spremenljivke', 'compare_var', "", "VARIABLE",
    (_, block) => block.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(_operators), "OPERATOR")
        .appendField(createField("VARIABLE2"), "VARIABLE2"),
    "Spremenljivke")



export default blocks
