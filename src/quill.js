import { LocDef } from './gameData'

class Locations {
    constructor() {
        let startLocation = new LocDef("Začetek", "Opis začetne lokacije")
        let locationExample = new LocDef("Primer", "Opis še ene lokacije")
        this._locations = [startLocation, locationExample]
    }

    get length() {
        return this._locations.length
    }

    getNames() {
        return this._locations.map(it => it.title)
    }

    getLocation(i) {
        return this._locations[i]
    }

    removeLocation(i) {
        this._locations.splice(i, 1)
    }

    _getUniqueName(name) {
        name = name.trim()
        const names = this.getNames()
        if (names.indexOf(name) == -1) {
            return name
        }
        const re = new RegExp(`^${name} \\((\\d+)\\)$`)
        const maxNum = Math.max(
            0, ...names.filter(name => re.test(name))
                       .map(name => parseInt(name.match(re)[1])))
        return `${name} (${maxNum + 1})`
    }

    addLocation() {
        const name = this._getUniqueName("Nova lokacija")
        this._locations.push(new LocDef(name, ""))
        return name
    }

    renameLocation(location, newName) {
        if (this._locations[location].title == newName) return;
        const name = this._getUniqueName(newName)
        this._locations[location].title = name
        return name
    }

    toXml() {
        const doc = document.implementation.createDocument(null, "odisej", null)
        const root = doc.getElementsByTagName("odisej")[0]
        this._locations.forEach(location => {
            const loc = doc.createElement("location")
            loc.setAttribute("name", location.title)

            const desc = doc.createElement("description")
            desc.appendChild(doc.createTextNode(location.description))
            loc.appendChild(desc)

            const blocks = doc.createElement("blocks")
            blocks.appendChild(doc.createTextNode(location.workspace))
            loc.appendChild(blocks)

            root.appendChild(loc)
        })
        return doc
    }

    fromXml(xml) {
        this._locations = []
        const root = xml.getElementsByTagName("odisej")[0]
        const doc = document.implementation.createDocument(null, "odisej", null)
        root.childNodes.forEach(node => {
            const locdef = new LocDef(
                node.getAttribute("name"),
                node.getElementsByTagName("description")[0].childNodes[0].textContent)
            locdef.workspace = node.getElementsByTagName("blocks")[0].childNodes[0].textContent
            this._locations.push(locdef)
        })
        updateLocationData()
    }
}

let items = []
export const locations = new Locations()

export const allItems = () => [...items.map(it => [it, it]), ["Dodaj stvar...", "ADD"]]



function download(data, filename, type) {
    const file = new Blob([data], {type: type})
    const url=URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(function() {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, 0)
}

function downloadDefinitions() {
    const xml = toXml()
    download(xml.getElementsByTagName("odisej")[0].outerHTML, 'lokacije.txt', 'text/xml')
}

