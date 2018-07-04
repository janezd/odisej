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
    return Array.from({length: 5}, () => Math.round(Math.random() * 2**32).toString(16))
                .join("-") }

class LocData {
    constructor(title, description, x=0, y=0, workspace=null, locId=null) {
        this.locId = locId || randomId()

        this.title = title
        this.description = description
        this.image = null
        this.workspace = workspace

        this.x = x
        this.y = y
        this.directions = {}
    }
}

class AllLocData {
    constructor() {
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
}

export function packBlockArgs(block, noNext=false) {
    function getChain(next) {
        const chain = []
        for(; next; next = next.nextConnection && next.nextConnection.targetBlock()) {
            chain.push(packBlockArgs(next, true))
        }
        return chain
    }

    if (!block) return null;
    const args = {'block': block.type.toLowerCase()}
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
                args[input.name.toLowerCase()] = getChain(input.connection.targetBlock())
        }
    })
    let next = block.nextConnection && block.nextConnection.targetBlock()
    if (!noNext && next) {
        args.next = getChain(next)
    }
    return args
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
    }
    catch (e) {}
}
