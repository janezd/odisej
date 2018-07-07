import Blockly from "node-blockly/browser"

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
    constructor(title, description, x=0, y=0, workspace=null, locId=null) {
        this.locId = locId || randomId()

        this.title = title
        this.description = description
        this.image = null
        this.workspace = workspace
        this.commands = []

        this.x = x
        this.y = y
        this.directions = {}
    }
}

class AllLocData {
    constructor() {
        this.reset()
    }

    reset() {
        this.workspace = null
        this.commands = []
    }

    toJson() {
        return JSON.stringify({workspace: this.workspace, commands: this.commands})
    }

    setFromJson({workspace, commands}) {
        this.workspace = workspace
        this.commands = commands
    }
}

class Locations {
    constructor() {
        this.reset()
    }

    reset() {
        this._locations = {}
        const defaultLoc = this.addLocation("Začetek", "Opis začetne lokacije", 100, 100)
        this.startLocation = defaultLoc.locId
    }

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

    removeLocation(location) {
        // TODO: check references in blocks and warn?
        const thisId = location.locId
        Object.values(this._locations).forEach( loc =>  {
            Object.entries(loc.directions)
                .filter( ([dir, where]) => where == thisId )
                .forEach( ([dir, where]) => delete loc.directions[dir] )
            }
        )
        delete this._locations[location.locId]
    }

    addLocation(name=null, description="", x=0, y=0) {
        name = getUniqueName(name || "Nova lokacija", this.getNames())
        const newLoc = new LocData(name, description, x, y)
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
        this._locations = locations
        this.startLocation = startLocation
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
export const allLocations = new AllLocData()

export function resetData() {
    items.reset()
    variables.reset()
    flags.reset()
    locations.reset()
    allLocations.reset()
}

export function packBlockArgs(block) {
    if (!block)
        return null

    const args = {
        'block': block.type.toLowerCase(),
        'next': packBlockArgs(block.nextConnection && block.nextConnection.targetBlock())
    }
    block.inputList.forEach(input => {
        switch (input.type) {
            case Blockly.DUMMY_INPUT:
                input.fieldRow.forEach(field => {
                    if (field.name) {
                        args[field.name.toLowerCase()] = field.getValue()
                    }
                })
                break
            case Blockly.INPUT_VALUE:
                const value = packBlockArgs(input.connection.targetBlock())
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
                args[input.name.toLowerCase()] = packBlockArgs(input.connection.targetBlock())
        }
    })
    return args
}


export function garbageCollection() {
    const allVariables = new Set()
    const allItems = new Set()
    const allFlags = new Set()

    function collectAll(obj) {
        if (!obj) return
        Object.entries(obj).forEach(([key, value]) => {
            if ((["show", "allow", "next", "statements", "not"].indexOf(key) != -1) || !isNaN((0).constructor(key))) {
                collectAll(value)
            }
            // TODO: This should be length == 44, but earlier id's could be shorter
            else if ((typeof value == "string") && (value.length > 10)) {
                switch (key) {
                    case "item": allItems.add(value); break
                    case "flag": allFlags.add(value); break
                    case "variable": case "variable2": allVariables.add(value); break
                }
            }
        })
    }

    locations.getLocations().forEach(loc => collectAll(loc.commands))
    collectAll(allLocations.commands)
    variables.clean(allVariables)
    items.clean(allItems)
    flags.clean(allFlags)
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
    migrate(allLocations.commands)
}

export function storeLocally() {
    localStorage.odisej = `{"locations": ${locations.toJson()}, "items": ${items.toJson()}, "variables": ${variables.toJson()}, "flags": ${flags.toJson()}, "allLocations": ${allLocations.toJson()}}`
}

export function restoreLocally(json) {
    try {
        json = json || localStorage.odisej
        const obj = JSON.parse(json)
        locations.setFromJson(obj.locations)
        items.setFromJson(obj.items)
        variables.setFromJson(obj.variables)
        flags.setFromJson(obj.flags)
        allLocations.setFromJson(obj.allLocations)
        migrateCommandLists()
    }
    catch (e) {}
}
