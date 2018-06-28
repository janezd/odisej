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


class LocData {
    constructor(title, description, x=0, y=0, workspace=null, locId=null) {
        this.locId = locId || Array.from({length: 5},
            () => Math.round(Math.random() * 2**32).toString(16)).join("-")

        this.title = title
        this.description = description
        this.image = null
        this.workspace = workspace

        this.x = x
        this.y = y
        this.directions = {}
    }
}

class Locations {
    constructor() {
        this._locations = {}
        this.addLocation("Začetek", "Opis začetne lokacije", 100, 100)
        this.addLocation("Primer", "Opis še ene lokacije", 200, 150)
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

    addLocation(name=null, description="") {
        name = getUniqueName(name || "Nova lokacija", this.getNames())
        const newLoc = new LocData(name, description)
        this._locations[newLoc.locId] = newLoc
        return newLoc
    }

    renameLocation(location, newName) {
        if (this._locations[location].title == newName) return;
        const name = getUniqueName(newName, this.getNames())
        this._locations[location].title = name
        return name
    }

    toJson() {
        return JSON.stringify(this._locations)
    }

    setFromJson(obj) {
        this._locations = obj
    }

    toXml(doc, base) {
        Object.values(this._locations).forEach(location => {
            const loc = doc.createElement("location")
            loc.setAttribute("name", location.title)
            loc.setAttribute("locId", location.locId)
            loc.setAttribute("x", location.x)
            loc.setAttribute("y", location.y)

            const desc = doc.createElement("description")
            desc.appendChild(doc.createTextNode(location.description))
            loc.appendChild(desc)

            const blocks = doc.createElement("blocks")
            blocks.appendChild(doc.createTextNode(location.workspace))
            loc.appendChild(blocks)

            base.appendChild(loc)
        })
    }

    fromXml(base) {
        function readTextChildXml(node, name) {
            const childNodes = node.getElementsByTagName(name)[0].childNodes
            return childNodes.length ? childNodes[0].textContent : ""
        }

        this._locations = {}

        Array.from(base.childNodes).forEach(node => {
            const locId = node.getAttribute("locId")

            this._locations[locId] =
                new LocData(node.getAttribute("name"),
                        readTextChildXml(node, "description"),
                        0, 0,
                        readTextChildXml(node, "blocks"),
                        locId
                    )
        })
    }
}


var itemCount = 0

class NameModel {
    constructor() {
        this._items = []
    }

    _getIndex(itemId) {
        return this._items.findIndex(it => it[1] == itemId)
    }

    get length() {
        return this._items.length
    }

    getNames() {
        return this._items.map(it => it[0])
    }

    getNamesIds() {
        return this._items.map(it => [it[0], `${it[1]}`])
    }

    getNameById(itemId) {
        const idx = this._getIndex(itemId)
        return idx != -1 ? this._items[idx][0] : null
    }

    add(name=null) {
        this._items.push([name || "stvar", ++itemCount])
        return itemCount
    }

    rename(itemId, newName) {
        this._items[this._getIndex(itemId)][0] = newName
    }

    remove(itemId) {
        this._items.splice(this._getIndex(itemId), 1)
    }

    toJson() {
        return JSON.stringify(this._items)
    }

    setFromJson(obj) {
        this._items = obj
    }

    toXml(doc, base) {
        this._items.forEach(item => {
            const it = doc.createElement("item")
            it.setAttribute("name", item[0])
            it.setAttribute("itemId", parseInt(item[1]))
            base.appendChild(it)
        })
    }

    fromXml(base) {
        this._items = Array.from(base.childNodes)
            .map(node => [node.getAttribute("name"), parseInt(node.getAttribute("itemId"))])
        itemCount = Math.max(itemCount, ...this._items.map(it => it[1]))
    }

}

export const items = new NameModel()
export const variables = new NameModel()
export const flags = new NameModel()
export const locations = new Locations()


function toJson() {
    return `{"locations": ${locations.toJson()}, "items": ${items.toJson()}, "variables": ${variables.toJson()}, "flags": ${flags.toJson()}}`
}

function fromJson(json) {
    const obj = JSON.parse(json)
    locations.setFromJson(obj.locations)
    items.setFromJson(obj.items)
    variables.setFromJson(obj.variables)
    flags.setFromJson(obj.flags)
}

function toXml() {
    const doc = document.implementation.createDocument(null, "odisej", null)
    const root = doc.getElementsByTagName("odisej")[0]

    function store(name, obj) {
        const base = doc.createElement(name)
        root.appendChild(base)
        obj.toXml(doc, base)
    }

    store("locations", locations)
    store("items", items)
    store("variables", variables)
    store("flags", flags)
    return doc
}

function fromXml(doc) {
    const restore =  (name, obj) => obj.fromXml(doc.getElementsByTagName(name)[0])

    restore("locations", locations)
    restore("items", items)
    restore("variables", variables)
    restore("flags", flags)
    return doc
}

export function storeLocally() {
    //localStorage.odisej = toXml().getElementsByTagName("odisej")[0].outerHTML
    localStorage.odisej = toJson()
}

export function restoreLocally() {
    return
    fromJson(localStorage.odisej)
    const parser = new DOMParser();
    try {
        const xmlDoc = parser.parseFromString(localStorage.odisej, "text/xml")
        fromXml(xmlDoc)
    }
    catch(err) {}
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
                const seq = input.name.match(/^(.*?)(\d+)$/)
                if (seq) {
                    if (seq[2] == "0") {
                        args[seq[1]] = []
                    }
                    if (value) {
                        args[seq[1]].push(value)
                    }
                }
                else {
                    args[input.name.toLowerCase()] = value
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
