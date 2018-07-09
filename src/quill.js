import Blockly from "node-blockly/browser"
import blocks from './createBlocks'

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

export function clearUsed(location) {
}

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
        workspace.getAllBlocks().forEach(block =>
            block.inputList
                .filter(input => input.type == Blockly.DUMMY_INPUT)
                .forEach(input =>
                    input.fieldRow.forEach(field => {
                        if (field.name) {
                            const value = field.getValue()
                            if (items.getNameById(value)) this.usedItems.push(value)
                            if (flags.getNameById(value)) this.usedFlags.push(value)
                            if (variables.getNameById(value)) this.usedVariables.push(value)
                            if (locations.getLocation(value)) this.usedLocations.push(value)
                        }
                    })
                )
        )
    }
}



class Locations {
    GENERAL_COMMANDS_ID = "00000000-00000000-00000000-00000000-00000001"
    STARTUP_COMMANDS_ID = "00000000-00000000-00000000-00000000-00000002"

    constructor() {
        this.reset()
    }

    reset() {
        this._locations = {}
        const defaultLoc = this.addLocation("Začetek", "Opis začetne lokacije", 150, 10)
        this.startLocation = defaultLoc.locId
        this.addSpecialLocations()
    }

    addSpecialLocations() {
        if (this.generalCommands == undefined)
            this.addLocation(
                "Na vseh lokacijah",
                "Tu vnesi ukaze, ki so možni na vseh lokacijah",
                10, 10, this.GENERAL_COMMANDS_ID)
        if (this.startupCommands == undefined)
            this.addLocation(
                "Na začetku igre",
                "Tu vnesi ukaze, ki se izvedejo na začetku igre. Uporabiš lahko le blok 'Ob vstopu'",
                10, 120, this.STARTUP_COMMANDS_ID)
    }

    get generalCommands() { return this.getLocation(this.GENERAL_COMMANDS_ID) }
    get startUpCommands() { return this.getLocation(this.STARTUP_COMMANDS_ID) }

    get length() {
        return this._locations.length
    }

    getNames() {
        return Object.values(this._locations).map(it => it.title)
    }

    getIds() {
        return Object.keys(this._locations)
    }

    getLocations() {
        return Object.values(this._locations)
    }

    getNamesIds() {
        return Object.values(this._locations).map(it => [it.title, it.locId])
    }

    getLocation(i) {
        return this._locations[i]
    }

    getNameById(i) {
        return this.getLocation(i).title
    }

    removeLocation(location) {
        Object.values(this._locations).forEach( loc =>  {
            Object.entries(loc.directions)
                .filter( ([dir, where]) => where == location )
                .forEach( ([dir, where]) => delete loc.directions[dir] )
            }
        )
        delete this._locations[location]
    }

    addLocation(name=null, description="", x=0, y=0, locId=null) {
        name = getUniqueName(name || "Nova lokacija", this.getNames())
        const newLoc = new LocData(name, description, x, y, locId)
        this._locations[newLoc.locId] = newLoc
        if (this._locations.size == 1) {
            this.startLocation = newLoc.locId
        }
        return newLoc
    }

    renameLocation(location, newName) {
        if (this._locations[location].title == newName) return;
        const name = getUniqueName(newName, this.getNames())
        this._locations[location].title = name
        return name
    }

    toJson() {
        return JSON.stringify({locations: this._locations, startLocation: this.startLocation})
    }

    setFromJson({locations, startLocation}) {
        this._locations = {}
        Object.entries(locations).forEach(([id, locdata]) => {
            const loc = new LocData()
            Object.entries(locdata).forEach(([key, value]) => loc[key] = value)
            this._locations[id] = loc
        })
        this.startLocation = startLocation
        this.addSpecialLocations()
    }

    collectUses = (things, skipLocation=null) => {
        const collection = {}
        locations.getLocations()
            .filter(loc => loc.locid != skipLocation)
            .forEach(loc =>
                loc[things].forEach(thing => collection[thing] = (collection[thing] || new Set()).add(loc.locId))
            )
        return collection
    }
}


class NameModel {
    constructor()           { this.reset() }
    reset()                 { this._items = {} }
    toJson()                { return JSON.stringify(this._items) }
    setFromJson(obj)        { this._items = obj }

    get length()            { return this._items.length }
    getNames()              { return Object.values(this._items) }
    getIds()                { return Object.keys(this._items) }
    getNamesIds()           { return Object.entries(this._items).map(it => [it[1], it[0]]) }
    getNameById(itemId)     { return this._items[itemId] }
    add(name=null)          { const itemId = randomId(); this._items[itemId] = name || "stvar"; return itemId }
    rename(itemId, newName) { this._items[itemId] = newName }
    remove(itemId)          { delete this._items[itemId] }
    clean(allowed)          { this.getIds().forEach(it => { if (!allowed.has(it)) this.remove(it) })}
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
    return
    items.clean(locations.collectUses('usedItems'))
    flags.clean(locations.collectUses('usedFlags'))
    variables.clean(locations.collectUses('usedVariables'))
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
    locations.getLocations().forEach(loc => migrate(loc.commands))
}

function migrateAddUsedSets() {
    blocks.forEach(tool => { Blockly.Blocks[tool.name] = tool.block } )

    const workspace = new Blockly.Workspace({toolbox: blocks})
    locations.getLocations().forEach(location => {
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(location.workspace), workspace)
        location.recomputeUses(workspace)
        workspace.clear()
    })
}

export function storeLocally() {
    localStorage.odisej = `{"locations": ${locations.toJson()}, "items": ${items.toJson()}, "variables": ${variables.toJson()}, "flags": ${flags.toJson()}}`
}

export function restoreLocally(json) {
    // TODO: Enable try-except, alert if something is there, but can't load it.
    //try {
        json = json || localStorage.odisej
        const obj = JSON.parse(json)
        locations.setFromJson(obj.locations)
        items.setFromJson(obj.items)
        variables.setFromJson(obj.variables)
        flags.setFromJson(obj.flags)

        // Migrations; remove before publishing
        if (obj.hasOwnProperty("allLocations")) {
            locations.generalCommands.workspace = obj.allLocations.workspace
            locations.generalCommands.commands = obj.allLocations.commands
        }
        migrateCommandLists()
        migrateAddUsedSets()
    //}
    //catch (e) {}
}


// TODO Re-enable garbage collection