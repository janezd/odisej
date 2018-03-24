import Blockly from 'node-blockly/browser'

import { allItems, locations } from './quill'


const blocks = []

function appendBlock(category, block_name, block) {
    //Blockly.Blocks[block_name] = block
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

function createField(fieldName) {
    if (fieldName == "LOCATION") return new Blockly.FieldDropdown(() => [...locations.getNames().map(it => [it, it]), ["Dodaj lokacijo...", "ADD"]])
    if (fieldName == "ITEM") return new Blockly.FieldDropdown(() => allItems())
    if (fieldName == "VARIABLE") return new Blockly.FieldVariable()
    return new Blockly.FieldTextInput("besedilo")
}

appendBlock('Akcije', 'command', {
    init: function() {
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
        init: function() {
          this.appendDummyInput()
              .appendField(name)
          if (other != null) {
              other(this)
          }
          this.setColour(36)
          this.setNextStatement(true, 'Akcija')
        }
    })
}

createTopBlock('on_entry', 'Ob vstopu')
createTopBlock('on_exit', 'Ob izstopu')
createTopBlock('after_command', 'Po ukazu')

appendBlock('Akcije', 'action', {
    init: function() {

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

function createCondition(block_name, condField, fieldName, other=null) {
    appendBlock('Pogoji', block_name, {
      init: function() {
          this.setInputsInline(false)
          this.appendDummyInput()
            .appendField(condField)
            .appendField(createField(fieldName), fieldName)
          if (other != null) {
              other(this)
          }
          this.setMsgInput()
          this.setOutput(true, "Boolean")
          this.setColour(246)
          this.addMsgInput()
          this.setOnChange(this.setMsgInput)
      },
      addMsgInput: function() {
        this.appendDummyInput("MSGDUMMY")
                  .appendField("Ugovor:")
                  .appendField(new Blockly.FieldTextInput('Ne moreš, ker ...'), 'MSG')
      },
      setMsgInput: function() {
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
    init: function() {
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
createCondition('item_is_at', "je", "ITEM",
    obj => obj.inputList[0]
              .appendField("na")
              .appendField(createField('LOCATION')))
createCondition('item_exists', "", "ITEM",
    obj => obj.inputList[0].appendField("obstaja"))
createCondition('item_is_here', "je", "ITEM",
    obj => obj.inputList[0].appendField("tukaj"))


createCondition('compare_var', "", "VARIABLE",
    obj => obj.inputList[0]
        .appendField(new Blockly.FieldDropdown([["=", "EQ"], ["<", "LE"], [">", "GE"]]), "OPERATOR")
        .appendField(new Blockly.FieldTextInput(''), "REFERENCE"))


function createStatement(block_name, statement, fieldName, other=null) {
    appendBlock("Ukazi", block_name, {
      init: function() {
          this.setInputsInline(false)
          this.appendDummyInput()
            .appendField(statement)
            .appendField(createField(fieldName), fieldName)
          if (other != null) {
              other(this)
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
    obj => obj.inputList[0].appendField("na").appendField(createField("LOCATION")))
createStatement("destroy", "uniči", "ITEM")
createStatement("print", "izpiši", "MSG")

export default blocks