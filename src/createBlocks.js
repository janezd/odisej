import Blockly from 'node-blockly/browser'

import { locations, items, variables, flags } from './quill'


const blocks = []

function appendBlock(category, block_name, block) {
    blocks.push({category: category, name: block_name, block: block})
}

function cleanUp(block, namePrefix, firstLine, beforeInput=null) {
    const conditions = block.conditions
    const lastConnection = (conditions.length > 0) ? conditions[conditions.length - 1].connection : false
    if ((lastConnection === false)
            || ((lastConnection != null) && (lastConnection.isConnected()))) {
        const newInput = block.appendValueInput("TEMP")
            .appendField('in hkrati')
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
    conditions[0].fieldRow[0].setText(firstLine)
    conditions[0].setAlign(Blockly.ALIGN_LEFT)
}


class FieldItems extends Blockly.FieldDropdown {
    constructor(nameModel, addMsg) {

        function createList() {
            const options = [...nameModel.getNamesIds(), [addMsg, "ADD"]]
            if (options.length > 1) {
                options.push(["Preimenuj...", "RENAME"], ["Odstrani...", "REMOVE"])
            }
            return options
        }

        super(createList)
        this.nameModel = nameModel
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
        else if (id == "REMOVE") {
            model.remove(this.getValue())
            this.setValue("ADD")
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
}


function createField(fieldName, placeholder=null) {
    if (fieldName.startsWith("LOCATION")) return new Blockly.FieldDropdown(locations.getNamesIds.bind(locations))
    if (fieldName.startsWith("ITEM")) return new FieldItems(items, "Stvar ...")
    if (fieldName.startsWith("VARIABLE")) return new FieldItems(variables, "Spremenljivka ...")
    if (fieldName.startsWith("FLAG")) return new FieldItems(flags, "Zastavica ...")
    return new Blockly.FieldTextInput(placeholder || "besedilo")
}

appendBlock('Akcije', 'command', {
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
        this.setOnChange(() => cleanUp(this, "SHOW", "pokaži, če"))
    }
})

function createTopBlock(block_name, name, other=null) {
    appendBlock("Akcije", block_name, {
        init() {
          this.appendDummyInput().appendField(name)
          this.setColour(36)
          this.setNextStatement(true, 'Akcija')
        }
    })
}

createTopBlock('on_entry', 'Ob vstopu')
createTopBlock('on_exit', 'Ob izstopu')
createTopBlock('after_command', 'Po ukazu')

appendBlock('Akcije', 'action', {
    init() {

        const condition = this.appendValueInput('ALLOW0')
            .appendField('če')
            .setCheck(['Boolean'])
        this.conditions = [condition]

        this.appendStatementInput('STATEMENTS')
            .appendField('izvedi')
        this.setColour(36)
        this.setPreviousStatement(true, 'Akcija')
        this.setNextStatement(true, 'Akcija')
        this.setOnChange(() =>
            cleanUp(
                this,
                "ALLOW",
                this.previousConnection
                && this.previousConnection.isConnected()
                && this.previousConnection.targetConnection.getSourceBlock().type == this.type
                ? "sicer če" : "če",
                "STATEMENTS"))
    }
})


appendBlock('Akcije', 'else_action', {
    init() {
        this.appendStatementInput('STATEMENTS')
            .appendField('sicer izvedi')
        this.setColour(36)
        this.setPreviousStatement(true, 'Akcija')
    }
})


appendBlock("Akcije", 'exits', {
    init() {
        this.appendDummyInput().appendField("Izhodi")
        for(let direction of ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"]) {
            this.appendDummyInput()
                .setAlign(Blockly.ALIGN_RIGHT)
                .appendField(direction)
                .appendField(new Blockly.FieldDropdown(() => [["", ""], ...locations.getNamesIds()]), `EXIT_${direction}`)
        }
        this.setColour(36)
    }
})

function createCondition(block_name, condField, fieldName, other=null, toolbox="Pogoji") {
    appendBlock(toolbox, block_name, {
      init() {
          this.setInputsInline(false)
          const row = this.appendDummyInput()
            .appendField(condField)
            .appendField(createField(fieldName), fieldName)
          if (other != null) {
              other(row, this)
          }
          this.setMsgInput()
          this.setOutput(true, "Boolean")
          this.setColour(246)
          this.addMsgInput()
          this.setOnChange(this.setMsgInput)
      },

      addMsgInput() {
        this.appendDummyInput("MSGDUMMY")
                  .appendField("Ugovor:")
                  .appendField(new Blockly.FieldTextInput('Ne moreš, ker ...'), 'MSG')
      },

      setMsgInput() {
          if (!this.outputConnection) return  // not initialized yet?
          let block = this
          while(block.outputConnection && block.outputConnection.isConnected()) {
              block = block.outputConnection.targetConnection.getSourceBlock()
          }
          if (block.type == 'command') {
              if (this.getInput("MSGDUMMY") != null) {
                  this.removeInput("MSGDUMMY")
              }
          }
          else if (this.getInput("MSGDUMMY") == null) {
              this.addMsgInput()
          }
      }
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

createCondition('does_have', "ima igralec", "ITEM")
createCondition('has_visited', "je igralec obiskal", "LOCATION")
createCondition('is_at', "je igralec na", "LOCATION")
createCondition('item_is_at', "je", "ITEM", row => row.appendField("na").appendField(createField('LOCATION'), "LOCATION"))
createCondition('item_exists', "", "ITEM", row => row.appendField("obstaja"))
createCondition('item_is_here', "je", "ITEM", row => row.appendField("tukaj"))
createCondition('flag_set', "", "FLAG", row => row.appendField("je postavljena"))
createCondition('flag_clear', "", "FLAG", row => row.appendField("ni postavljena"))


function createStatement(block_name, statement, fieldName, other=null) {
    appendBlock("Ukazi", block_name, {
      init() {
          this.setInputsInline(false)
          const row = this.appendDummyInput()
            .appendField(statement)
            .appendField(createField(fieldName), fieldName)
          if (other != null) {
              other(row, this)
          }
          this.setPreviousStatement(true)
          this.setNextStatement(true)
          this.setColour(186)
      }
    })
}


createStatement("go", "pojdi na", "LOCATION")
createStatement("pick", "vzemi", "ITEM")
createStatement("drop", "spusti", "ITEM")
createStatement("item_at", "postavi", "ITEM",
    row => row.appendField("na").appendField(createField("LOCATION"), "LOCATION"))
createStatement("destroy", "uniči", "ITEM")
createStatement("set_flag", "postavi", "FLAG")
createStatement("clear_flag", "pobriši", "FLAG")
createStatement("print", "izpiši", "MSG")


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

createCondition('compare_const', "", "VARIABLE",
    (_, block) => block.appendDummyInput().setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldDropdown([["=", "EQ"], ["<", "LE"], [">", "GE"]]), "OPERATOR")
        .appendField(new Blockly.FieldTextInput('vrednost'), "CONSTANT"),
    "Spremenljivke")


createCondition('compare_var', "", "VARIABLE",
    (_, block) => block.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([["=", "EQ"], ["<", "LE"], [">", "GE"]]), "OPERATOR")
        .appendField(createField("VARIABLE2"), "VARIABLE2"),
    "Spremenljivke")



export default blocks
