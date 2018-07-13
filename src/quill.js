import Blockly from "node-blockly/browser"
import blocks from './createBlocks'

export const gameSettings = {
    allowRestart: true,
    showInventory: true,
    dropItems: true,
    takeItems: true,
    maxItems: ""
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
        this.image = null

        this.workspace = null
        this.commands = []

        this.x = x
        this.y = y
        this.directions = {}

        this.clearUsed()
    }

    updateFromWorkspace = workspace => {
        this.workspace = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace))
        this.commands = workspace.getTopBlocks().map(block => this.packBlockArgs(block))
        this.recomputeUses(workspace)
        collectGarbage()
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

    isSpecial = loc => loc.locId.startsWith("00000000-00000000-00000000-00000000-0000000")

    keys = () => Object.keys(this).filter(key => this[key] instanceof LocData)
    values = () => Object.values(this).filter(value => value instanceof LocData)
    entries = () => Object.entries(this).filter(([key, value]) => value instanceof LocData)
    clear = () => { this.keys().forEach(key => delete this[key]) }

    reset = () => {
        this.clear()
        const defaultLoc = this.addLocation("Začetek", "", 150, 10)
        this.addSpecialLocations()
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
        this[newLoc.locId] = newLoc
        return newLoc
    }

    removeLocation = location => {
        this.values().forEach( loc =>  {
            Object.entries(loc.directions)
                .filter( ([dir, where]) => where == location )
                .forEach( ([dir, where]) => delete loc.directions[dir] )
        })
        delete this[location]
    }

    renameLocation = (location, newName) =>
        this[location].title == newName ? newName : this[location].title = getUniqueName(newName, this.values())

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

    collectUses = (things, skipLocation=null) => {
        const collection = {}
        locations.values()
            .filter(loc => loc.locId != skipLocation)
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

    reset()                 { this.clear() }
    add(name=null)          { const itemId = randomId(); this[itemId] = name || "stvar"; return itemId }
    rename(itemId, newName) { this[itemId] = newName }
    remove(itemId)          { delete this[itemId] }
    clear(allowed)          { this.keys().forEach(key => { if (!allowed || !allowed[key]) delete this[key] })}

    pack()                  { return this.entries() }
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

export function storeLocally() {
    localStorage.odisej = JSON.stringify({
        locations: locations.pack(), items: items.pack(), flags: flags.pack(), variables: variables.pack(),
        gameSettings
    })
}

export function restoreLocally(json) {
    const migrated = obj => Array.isArray(obj) ? obj : Object.entries(obj)
    // TODO: Enable try-except, alert if something is there, but can't load it.
    //try {
        json = json || localStorage.odisej
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
        collectGarbage()
    //}
    //catch (e) {}
}
