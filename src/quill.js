import Blockly from "node-blockly/browser"
import blocks, {refreshDropdowns} from './createBlocks'


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

const defaultGameSettings = {
    showInventory: true,
    dropItems: true,
    takeItems: true,
    maxItems: "",
    gameTitle: "Odisej"
}

export const gameSettings = {
    showInventory: true,
    dropItems: true,
    takeItems: true,
    maxItems: "",
    gameTitle: "Odisej"
}

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

function randomId() {
    return Array.from({length: 5}, () => Math.round(Math.random() * 2**32).toString(16).padStart(8, "0"))
                .join("-") }

class LocData {
    constructor(title, description, x=0, y=0, locId=null) {
        this.locId = locId || randomId()

        this.title = title
        this.description = description
        this.image = [null, 0, 0]

        this.workspace = null
        this.commands = []

        this.x = x
        this.y = y
        this.directions = {}

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
                this.commands = ws.getTopBlocks().map(block => this.packBlockArgs(block))
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


class Locations {
    GENERAL_COMMANDS_ID = "00000000-00000000-00000000-00000000-00000001"

    constructor() {
        this.reset()
    }

    isSpecial = loc => (loc instanceof LocData ? loc.locId : loc).startsWith("00000000-00000000-00000000-00000000-0000000")

    keys = () => Object.keys(this).filter(key => this[key] instanceof LocData)
    values = () => Object.values(this).filter(value => value instanceof LocData)
    entries = () => Object.entries(this).filter(([key, value]) => value instanceof LocData)
    clear = () => { this.keys().forEach(key => delete this[key]) }

    reset = () => {
        this.clear()
        const defaultLoc = this.addLocation("Začetek", "", 150, 10)
        this.addSpecialLocations()
        Undo.reset()
        this.startLocation = defaultLoc.locId
    }

    addSpecialLocations= () => {
        if (this.generalCommands == undefined)
            this.addLocation(
                "Na vseh lokacijah",
                "Tu vnesi ukaze, ki so možni na vseh lokacijah",
                10, 10, this.GENERAL_COMMANDS_ID)
    }

    get generalCommands() { return this[this.GENERAL_COMMANDS_ID] }

    addLocation = (name=null, description="", x=0, y=0, locId=null) => {
        const newName = getUniqueName(name || "Nova lokacija", this.values().map(it => it.title))
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

    pack = () => ({locations: this.entries(), startLocation: this.startLocation})

    unpack = ({locations, startLocation}) => {
        this.clear()
        locations.forEach(([id, locdata]) => {
            const loc = new LocData()
            Object.assign(loc, locdata)
            this[id] = loc
        })
        this.startLocation = startLocation
        this.addSpecialLocations()
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


class NameModel {
    keys() { return Object.keys(this).filter(key => typeof this[key] == "string") }
    values() { return Object.values(this).filter(value => typeof value == "string") }
    entries() { return Object.entries(this).filter(([key, value]) => typeof value == "string") }

    add(name=null) {
        const itemId = randomId()
        const undo = () => { delete this[itemId] }
        const redo = () => this[itemId] = name || "stvar"
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

    clear(allowed) {
        this.keys().forEach(key =>
            { if (!allowed || !allowed[key]) this.remove(key) })
    }

    reset() {
        this.clear()
    }

    pack() {
        return this.entries()
    }
    unpack(data) {
        this.reset()
        data.forEach(([key, value]) => this[key] = value)
    }
}

export const items = new NameModel()
export const variables = new NameModel()
export const flags = new NameModel()
export const locations = new Locations()

export function resetData() {
    items.reset()
    variables.reset()
    flags.reset()
    locations.reset()
    Object.assign(gameSettings, defaultGameSettings)
    Undo.reset()
}

function collectGarbage() {
    items.clear(locations.collectUses('usedItems'))
    flags.clear(locations.collectUses('usedFlags'))
    variables.clear(locations.collectUses('usedVariables'))
}


function migrateCommandLists() {
    function migrate(obj) {
        if (!obj) return
        if (Array.isArray(obj.statements))
            obj.statements = obj.statements.reduceRight((next, block) => ({next, block}), {})
        if (Array.isArray(obj.next))
            obj.next = obj.next.reduceRight((next, block) => ({next, block}), {})
        Object.entries(obj).forEach(([key, value]) => {
            if ((["show", "allow", "next", "statements", "not"].indexOf(key) != -1) || !isNaN((0).constructor(key))) {
                migrate(value)
            }
        })
    }
    locations.values().forEach(loc => migrate(loc.commands))
}

function migrateAddUsedSets() {
    blocks.forEach(tool => { Blockly.Blocks[tool.name] = tool.block } )

    const workspace = new Blockly.Workspace({toolbox: blocks})
    locations.values().forEach(location => {
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(location.workspace), workspace)
        location.recomputeUses(workspace)
        workspace.clear()
    })
}

function migrateImages() {
    locations.values().forEach(location => {
        if (!Array.isArray(location.image))
            location.image = [location.image, 105, 105]
    })
}

export function storeLocally() {
    localStorage.odisej = JSON.stringify({
        locations: locations.pack(), items: items.pack(), flags: flags.pack(), variables: variables.pack(),
        gameSettings
    })
}

export function restoreLocally(json) {
    const migrated = obj => Array.isArray(obj) ? obj : Object.entries(obj)
    // TODO: Enable try-except, alert if something is there, but can't load it.
    try {
        if (!json) {
            json = localStorage.odisej
            if (!json)
                return
        }
        const obj = JSON.parse(json)

        locations.unpack({locations: migrated(obj.locations.locations), startLocation: obj.locations.startLocation})
        items.unpack(migrated(obj.items))
        flags.unpack(migrated(obj.flags))
        variables.unpack(migrated(obj.variables))
        // TODO Remove '|| {}' when migrations are no longer needed
        Object.assign(gameSettings, obj.gameSettings || {})

        // Migrations; remove before publishing
        if (obj.hasOwnProperty("allLocations")) {
            locations.generalCommands.workspace = obj.allLocations.workspace
            locations.generalCommands.commands = obj.allLocations.commands
        }
        migrateCommandLists()
        migrateAddUsedSets()
        migrateImages()
        collectGarbage()
        Undo.reset()
    }
    catch (e) {
        alert("Napaka pri branju podatkov.")
    }
}


export function saveGame() {
    const blob = new Blob([localStorage.odisej], { type: 'text/plain' })
    const anchor = document.createElement('a');
    anchor.download = "odisej.json";
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':')
    anchor.click()
}

export function loadGame(file, then) {
    const reader = new FileReader()
    reader.onload = json => { restoreLocally(json.target.result); then && then() }
    reader.readAsText(file)
}

