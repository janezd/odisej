class Condition {
    constructor(msg=null, negate=false) {
        this.msg_on_fail = msg; this.negate = negate;
    }
    _check() {
        return true;
    }
    isProhibited() {
        return this._check() === this.negate ? this.msg_on_fail : false;
    }
}

class OnLocation extends Condition {
    constructor(location, msg=null, negate=false) {
        super(msg, negate);
        this.location = location;
    }
    _check() {
        return game.location === this.location;
    }
}

class ItemIsAt extends Condition {
    constructor(item, location, msg=null, negate=false) {
        super(msg, negate);
        this.item = item;
        this.location = location;
    }
    _check() {
        return this.item.location === (this.location === locHere) ? game.location : this.location;
    }
}

class FlagEquals extends Condition {
    constructor(flag, value, msg=null, negate=false) {
        super(msg, negate);
        this.flag = flag;
        this.value = value;
    }
    _check() {
        return this.flag.value == this.value;
    }
}


class Action {
}

class MoveTo extends Action {
    constructor(newLocation) {
        super();
        this.newLocation = newLocation;
    }
    act() {
        game.moveTo(this.newLocation);
    }
}

class MoveItem extends Action {
    constructor(item, newLocation) {
        super();
        this.item = item;
        this.newLocation = newLocation;
    }
    act() {
        this.item.location = (this.newLocation === locHere) ? game.location : this.newLocation;
    }
}

class SetFlag extends Action {
    constructor(flag, value) {
        super();
        this.flag = flag;
        this.value = value;
    }
    act() {
        this.flag.value = this.value;
    }
}

class Message extends Action {
    constructor(message) {
        super();
        this.message = message;
    }
    act() {
        game.showMessage(this.message);
    }
}

class Pause extends Action {
    constructor(time) {
        super();
        this.time = time;
    }
    act() {
        game.pause();
    }
}

class Die extends Action {
    act() {
        game.die();
    }
}


class Command {
    constructor(description, conditions, visible, actions) {
        this.description = description;
        this.conditions = conditions;
        this.visible = visible;
        this.actions = actions;
    }
    checkProhibitions(conds) {
        for(var cond of conds) {
            const msg = cond.isProhibited();
            if (msg !== false) {
                return msg;
            }
        }
        return null;
    }
    get isProhibited() {
        return this.checkProhibitions(this.conditions) !== null;
    }
    get isHidden() {
        return this.checkProhibitions(this.visible) !== null;
    }
    act() {
        this.actions.forEach(action => action.act());
    }
}


class Item {
    constructor(name) {
        this.name = name;
        this.location = null;
    }
}

class Flag {
    constructor(name) {
        this.name = name;
        this.value = null;
    }
}

class LocDef {
    constructor(title, description) {
        this.title = title;
        this.description = description;
        this.commands = {}
    }
    describe() {
        return this.description
    }
    availableCommands() {
        return this.commands.filter(command => (command.description[0] != "@") && !command.isHidden)
    }
    runDefaultCommands(kind) {
        this.commands
            .filter(command => (command.description == kind) && !command.isProhibited)
    .forEach(command => command.act())
    }
    runAutoCommands() {
        this.runDefaultCommands('@')
    }
    runEntryCommands() {
        this.runDefaultCommands('@@')
    }
    runCommand(description) {
        var msg;
        for(let command of this.commands.filter(command => command.description == description)) {
            msg = command.checkProhibitions(command.conditions);
            if (msg === null) {
                command.act();
                game.locDesc.forceUpdate();
                return;
            }
        }
        if (msg != null) {
            game.showMessage(msg);
        }
    }
}
