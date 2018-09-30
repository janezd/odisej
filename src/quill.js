import Blockly from "node-blockly/browser"

import blocks, {refreshDropdowns} from './createBlocks'
import { LocData as GameLocData,
         Locations as GameLocations,
         NameModel as GameNameModel,
         randomId,
         unpackGameData, packGameData, defaultGameSettings } from './gameData'

import _ from '../translations/translator'

export const Undo = {
    undoStack: [],
    redoStack: [],

    push: (undo, redo, data=null) => Undo.undoStack.push([undo, redo, data]),
    merge: (redo, data=null) => {
        const last = Undo.undoStack[Undo.undoStack.length - 1]
        last[1] = redo
        last[2] = data
    },
    putMark: (stack=null) => (stack || Undo.undoStack).push([null, null]),
    undo: () => Undo.roll(Undo.undoStack, Undo.redoStack),
    redo: () => Undo.roll(Undo.redoStack, Undo.undoStack),
    reset: () => Undo.undoStack.length = Undo.redoStack.length = 0,
    lastData: () => (Undo.undoStack.length && Undo.undoStack[Undo.undoStack.length - 1][2]) || null,

    roll: (fromStack, toStack) => {
        if (!fromStack.length)
            return false
        Undo.putMark(toStack)
        // Skip empty undos
        while (fromStack.length && !fromStack[fromStack.length - 1][0]) {
            fromStack.pop()
        }
        while (fromStack.length) {
            const [action, opposite] = fromStack.pop()
            if (!action)
                return true
            toStack.push([opposite, action])
            action()
        }
    }
}

Undo.reset()


function getUniqueName(name, names) {
    name = name.trim()
    if (names.indexOf(name) == -1) {
        return name
    }
    const re = new RegExp(`^${name} \\((\\d+)\\)$`)
    const maxNum = Math.max(
        0, ...names.filter(name => re.test(name))
            .map(name => parseInt(name.match(re)[1])))
    return `${name} (${maxNum + 1})`
}

class LocData extends GameLocData {
    constructor(title, description, x=0, y=0, locId=null) {
        super(title, description, x, y, locId)
        this.clearUsed()
    }

    removeConnection(direction) {
        const curr_direction = this.directions[direction]
        if (curr_direction) {
            const undo = () => this.directions[direction] = curr_direction
            const redo = () => delete this.directions[direction]
            Undo.push(undo, redo)
            redo()
        }
    }

    setConnection(direction, where) {
        const curr_direction = this.directions[direction]
        if (curr_direction != where) {
            const undo = curr_direction
                ? (() => this.directions[direction] = curr_direction)
                : (() => delete this.directions[direction])
            const redo = () => this.directions[direction] = where
            Undo.push(undo, redo)
            redo()
        }
    }

    setTitle = (newTitle) => {
        const oldTitle = this.title
        if (newTitle != oldTitle) {
            const undo = () => { this.title = oldTitle; refreshDropdowns(this.locId, oldTitle) }
            const redo = () => { this.title = newTitle; refreshDropdowns(this.locId, newTitle) }
            Undo.push(undo, redo)
            redo()
        }
    }

    setDescription = (newDescription) => {
        const oldDescription = this.description
        if (newDescription != oldDescription) {
            const undo = () => this.description = oldDescription
            const redo = () => this.description = newDescription
            Undo.push(undo, redo)
            redo()
        }
    }

    setImage = (newImage) => {
        const oldImage = this.image
        if (newImage != oldImage) {
            const undo = () => this.image = oldImage
            const redo = () => this.image = newImage
            Undo.push(undo, redo)
            redo()
        }
    }

    setWorkspace = (workspace, mergeIfPossible=false) => {
        const newWorkspaceAsString = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace))
        const oldWorkspaceAsString = this.workspace
        if (newWorkspaceAsString != oldWorkspaceAsString) {
            const recomputeCommandsAndUses = (ws) => {
                this.commands = ws.getTopBlocks(true).map(block => this.packBlockArgs(block))
                this.commands.forEach(cmd => cmd.cmdId = randomId())
                this.recomputeUses(ws)
            }
            const recompute = () => {
                const ws = new Blockly.Workspace({toolbox: blocks})
                Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(this.workspace), ws)
                recomputeCommandsAndUses(ws)
                ws.clear()
            }

            const undo = () => {
                this.workspace = oldWorkspaceAsString
                recompute()
            }
            const redo = () => {
                this.workspace = newWorkspaceAsString
                recompute()
            }

            if (mergeIfPossible && (Undo.lastData() == oldWorkspaceAsString)) {
                Undo.merge(redo.bind(this), newWorkspaceAsString)
            }
            else {
                Undo.push(undo.bind(this), redo.bind(this), newWorkspaceAsString)
            }

            this.workspace = newWorkspaceAsString
            recomputeCommandsAndUses(workspace)
            collectGarbage()
        }
    }

    clearUsed = () => {
        this.usedItems = []
        this.usedFlags = []
        this.usedVariables = []
        this.usedLocations = []
        this.movesTo = []
    }

    packBlockArgs = block => {
        if (!block)
            return null

        const args = {
            'block': block.type.toLowerCase(),
            'next': this.packBlockArgs(block.nextConnection && block.nextConnection.targetBlock())
        }
        block.inputList.forEach(input => {
            switch (input.type) {
                case Blockly.DUMMY_INPUT:
                    input.fieldRow.forEach(field => {
                        if (field.name) {
                            const value = field.getValue()
                            args[field.name.toLowerCase()] = value
                        }
                    })
                    break
                case Blockly.INPUT_VALUE:
                    const value = this.packBlockArgs(input.connection.targetBlock())
                    const name = input.name.toLowerCase()
                    const seq = name.match(/^(.*?)(\d+)$/)
                    if (seq) {
                        if (seq[2] == "0") {
                            args[seq[1]] = []
                        }
                        if (value) {
                            args[seq[1]].push(value)
                        }
                    }
                    else {
                        args[name] = value
                    }
                    break
                case Blockly.NEXT_STATEMENT:
                    args[input.name.toLowerCase()] = this.packBlockArgs(input.connection.targetBlock())
            }
        })
        return args
    }

    recomputeUses = workspace => {
        this.clearUsed()
        workspace.getAllBlocks().forEach(block => {
            block.inputList
                .filter(input => input.type == Blockly.DUMMY_INPUT)
                .forEach(input =>
                    input.fieldRow.forEach(field => {
                        if (field.name) {
                            const value = field.getValue()
                            if (items[value]) this.usedItems.push(value)
                            if (flags[value]) this.usedFlags.push(value)
                            if (variables[value]) this.usedVariables.push(value)
                            if (locations[value]) this.usedLocations.push(value)
                        }
                    })
                )
            if (block.type == "go") {
                const where = block.inputList[0].fieldRow[1].getValue()
                if (this.movesTo.indexOf(where) == -1) {
                    this.movesTo.push(where)
                }
            }
        })
    }
}


class Locations extends GameLocations {
    constructor() {
        super()
        this.reset()
    }

    reset = () => {
        this.clear()
        const defaultLoc = this.addLocation(_("Start@@DefaultLocations"), "", 150, 10)
        this.addSpecialLocations()
        Undo.reset()
        this.startLocation = defaultLoc.locId
    }

    addSpecialLocations= () => {
        this.addLocation(
            _("All locations@@DefaultLocations"),
            _("Here you can define commands available or executed on all locations"),
            10, 10, this.GENERAL_COMMANDS_ID)
    }

    addLocation = (name=null, description="", x=0, y=0, locId=null) => {
        const newName = getUniqueName(name || _("New location"), this.values().map(it => it.title))
        const newLoc = new LocData(newName, description, x, y, locId)
        const redo = () => this[newLoc.locId] = newLoc
        const undo = () => delete this[newLoc.locId]
        Undo.push(undo, redo)
        redo()
        return newLoc
    }

    removeLocation = location => {
        this.values().forEach( loc =>  {
            Object.entries(loc.directions)
                .filter( ([dir, where]) => where == location )
                .forEach( ([dir, where]) => loc.removeConnection(dir) )
        })
        const oldLocation = this[location]
        const redo = () => delete this[location]
        const undo = () => this[location] = oldLocation
        Undo.push(undo, redo)
        redo()
        collectGarbage()
    }

    checkRemoveLocation = (locId) => {
        if ((locId == this.startLocation) || this.isSpecial(locId))
            return false
        const used = this.collectUses("usedLocations", new Set([locId]))[locId]
        if (used && used.size)
            return [...used].map(id => this[id].title)
        return true
    }

    checkRemoveLocations = (locations) => {
        const used = this.collectUses("usedLocations", locations)
        for(let locId of locations)
            if ((locId == this.startLocation) || this.isSpecial(locId) || (used[locId] && used[locId].size))
                return false
        return true
    }

    setStartLocation = (locId) => {
        const oldStartLocation = this.startLocation
        if (locId != oldStartLocation) {
            const undo = () => this.startLocation = oldStartLocation
            const redo = () => this.startLocation = locId
            Undo.push(undo.bind(this), redo.bind(this))
            redo()
        }
    }

    collectUses = (things, skipLocations=null) => {
        const collection = {}
        locations.values()
            .filter(loc => !(skipLocations && skipLocations.has(loc.locId)))
            .forEach(loc =>
                loc[things].forEach(thing => collection[thing] = (collection[thing] || new Set()).add(loc.locId))
            )
        return collection
    }
}


class NameModel extends GameNameModel {
    add(name=null) {
        const itemId = randomId()
        const undo = () => { delete this[itemId] }
        const redo = () => this[itemId] = name || _("item")
        Undo.push(undo, redo)
        redo()
        return itemId
    }

    rename(itemId, newName) {
        const oldName = this[itemId]
        if (newName != oldName) {
            const undo = () => this[itemId] = oldName
            const redo = () => this[itemId] = newName
            Undo.push(undo, redo)
            redo()
        }
    }

    remove(itemId) {
        const itemName = this[itemId]
        if (itemName) {
            const undo = () => this[itemId] = itemName
            const redo = () => { delete this[itemId] }
            Undo.push(undo, redo)
            redo()
        }
    }

    clearUnused(used) {
        this.keys()
            .filter(key => !used[key])
            .forEach(key => this.remove(key))
    }

    reset() {
        this.clear()
    }
}

export const items = new NameModel()
export const variables = new NameModel()
export const flags = new NameModel()
export const locations = new Locations()
export const gameSettings = {}
Object.assign(gameSettings, defaultGameSettings)

export function resetData() {
    items.reset()
    variables.reset()
    flags.reset()
    locations.reset()
    Object.assign(gameSettings, defaultGameSettings)
    Undo.reset()
}

function collectGarbage() {
    items.clearUnused(locations.collectUses('usedItems'))
    flags.clearUnused(locations.collectUses('usedFlags'))
    variables.clearUnused(locations.collectUses('usedVariables'))
}

export function storeLocally() {
    localStorage.odisej =
        packGameData({locations, items, flags, variables, gameSettings})
}

export function restoreLocally() {
    unpackGameData(localStorage.odisej,
        {locations, items, flags, variables, gameSettings},
        LocData)
}

export function saveGame() {
    const blob = new Blob([localStorage.odisej], { type: 'text/plain' })
    const anchor = document.createElement('a')
    anchor.download = `${gameSettings.gameTitle}.game`
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':')
    anchor.click()
}

export function loadGame(file, then) {
    const reader = new FileReader()
    reader.onload = json => {
        localStorage.odisej = json.target.result
        restoreLocally()
        then && then()
    }
    reader.readAsText(file)
}


function _packIntoHtml() {
    const json = localStorage.odisej.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const gameHtml = gameTemplate
        .replace("game = null", `game = '${json}'`)  // development
        .replace("{gameData:null}", `{gameData:'${json}'}`)  // production
    const blob = new Blob([gameHtml], { type: 'text/html' })
    const anchor = document.createElement('a')
    anchor.download = `${gameSettings.gameTitle}.html`
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/html', anchor.download, anchor.href].join(':')
    anchor.click()
}

var gameTemplate = null

export function packGame() {
    if (gameTemplate)
        _packIntoHtml()
    else {
        var httpRequest = new XMLHttpRequest()
        httpRequest.onreadystatechange = () => {
            if ((httpRequest.readyState === 4) && (httpRequest.status === 200)) {
                gameTemplate = httpRequest.responseText
                _packIntoHtml()
            }
        }
        httpRequest.open('GET', 'play.html')
        httpRequest.send()
    }
}
