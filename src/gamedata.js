import _ from '../translations/translator'

export const INV_OPTIONS = { DONT_SHOW: 0, SHOW_BUTTON: 1, SHOW_ALWAYS: 2 }

export const defaultGameSettings = {
    showInventory: INV_OPTIONS.SHOW_ALWAYS,
    dropItems: true,
    takeItems: true,
    maxItems: "",
    gameTitle: _("Odyssey")
}

export function randomId() {
    return Array.from({length: 5}, () => Math.round(Math.random() * 2**32).toString(16).padStart(8, "0"))
                .join("-") }

export class LocData {
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
    }
}


export class Locations {
    GENERAL_COMMANDS_ID = "00000000-00000000-00000000-00000000-00000001"
    isSpecial = loc => (loc instanceof LocData ? loc.locId : loc).startsWith("00000000-00000000-00000000-00000000-0000000")

    keys = () => Object.keys(this).filter(key => this[key] instanceof LocData)
    values = () => Object.values(this).filter(value => value instanceof LocData)
    entries = () => Object.entries(this).filter(([key, value]) => value instanceof LocData)

    get generalCommands() { return this[this.GENERAL_COMMANDS_ID] }

    clear = () => this.keys().forEach(key => delete this[key])
    pack = () => ({locations: this.entries(), startLocation: this.startLocation})
    unpack = ({locations, startLocation}, LocDataProto=LocData) => {
        this.clear()
        locations.forEach(([id, locdata]) => {
            const loc = new LocDataProto()
            Object.assign(loc, locdata)
            this[id] = loc
        })
        this.startLocation = startLocation
    }
}


export class NameModel {
    keys = () => Object.keys(this).filter(key => typeof this[key] == "string")
    values = () => Object.values(this).filter(value => typeof value == "string")
    entries = () => Object.entries(this).filter(([key, value]) => typeof value == "string")

    clear = () => this.keys().forEach(key => this.remove(key))
    pack = () => this.entries()
    unpack = (data) => {
        this.clear()
        data.forEach(([key, value]) => this[key] = value)
    }
}


export function packGameData({locations, items, flags, variables, gameSettings}) {
    return JSON.stringify({
        locations: locations.pack(), items: items.pack(), flags: flags.pack(), variables: variables.pack(),
        gameSettings
    })
}


export function unpackGameData(json, {locations, items, flags, variables, gameSettings}, LocDataProto) {
    try {
        const obj = JSON.parse(json)
        locations.unpack(obj.locations, LocDataProto),
        items.unpack(obj.items),
        flags.unpack(obj.flags),
        variables.unpack(obj.variables),
        Object.assign(gameSettings, obj.gameSettings)
        return { locations, items, flags, variables, gameSettings }
        }
    catch (e) {
        alert(_("An error occurred while reading the data."))
    }
}
