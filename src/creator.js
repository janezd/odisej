import React from "react"
import { Modal, FormGroup, FormControl, ControlLabel, Input, Label, Button, Checkbox, Navbar, ButtonToolbar, Media, ButtonGroup,
Radio} from 'react-bootstrap'

import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'

import _ from '../translations/translator'
import { LanguageSelector } from '../translations/translator'

import blocks from './createBlocks'
import { refreshDropdowns, createBlocks } from './createBlocks'
import { locations, items, flags, variables,
         gameSettings, storeLocally, resetData, saveGame, loadGame, packGame, Undo, INV_OPTIONS } from './quill'
import GameMap from './map'

Blockly.BlockSvg.START_HAT = true
// Blockly.Flyout.prototype.autoClose = false

window.React = React

class BlocklyDrawerWithNameCheck extends BlocklyDrawer {
    onResize() {
        this.content.style.left = '0px';
        this.content.style.top = '0px';
        this.content.style.width = '100%';
        this.content.style.height =
            (document.getElementsByClassName("modal-content")[0].getBoundingClientRect().height
             - document.getElementsByClassName("modal-header")[0].offsetHeight
             - document.getElementsByClassName("loc-description")[0].offsetHeight)
             - 30 // padding
            + 'px'
        this.content.style.position = "relative"
    }
}


class SettingsEditor extends React.Component {
    constructor(props) {
        super(props)
        this.state = gameSettings
    }

    changeMaxItems = (e) => {
        const val = e.target.value ? parseInt(e.target.value) : e.target.value
        if (!isNaN(val))
            this.setState({maxItems: val})
    }

    changeGameTitle = e => this.setState({gameTitle: e.target.value.split("\n").join("")})

    onHide = () => {
        Object.keys(gameSettings).forEach(key => gameSettings[key] = this.state[key])
        this.props.closeHandler()
    }

    setInventoryOption = i => this.setState({showInventory: i})

    render() {
        if (!this.props.show) return null
        return <Modal dialogClassName="location-editor" show={true} onHide={this.onHide} enforceFocus={true}>
            <Modal.Header closeButton>
                <Modal.Title>{_("Game Settings")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FormGroup>
                    <ControlLabel>{_("Game Title")}</ControlLabel>
                    <FormControl id="game-title"
                                 type="text"
                                 bsSize="large"
                                 value={this.state.gameTitle}
                                 onChange={this.changeGameTitle}
                                 placeholder={_("Odyssey")}/>
                    <ControlLabel>{_("Show Inventory")}</ControlLabel>
                    { [_("Don't show"), _("Show button 'Inventory'"), _("Always show a list of items")].map((option, i) =>
                        <Radio key={i}
                               name="inventory-options"
                               checked={this.state.showInventory==i}
                               onChange={() => this.setState({showInventory: i})}>
                            {option}
                        </Radio>
                    )}
                    <ControlLabel>{_("Extra commands")}</ControlLabel>
                    <Checkbox checked={this.state.dropItems && (this.state.showInventory != INV_OPTIONS.DONT_SHOW)}
                              disabled={this.state.showInventory == INV_OPTIONS.DONT_SHOW}
                              onChange={e => this.setState({dropItems: e.target.checked})}>
                        {_("Dropping of items using a button in the inventory list")}
                    </Checkbox>
                    <Checkbox checked={this.state.takeItems}
                              onChange={e => this.setState({takeItems: e.target.checked})}>
                        {_("Commands for taking items at locations")}
                    </Checkbox>
                    <ControlLabel>{_("Maximal number of carried items (leave empty for no limit)")}</ControlLabel>
                    <FormControl id="inventory-size-limit"
                                 type="text"
                                 value={this.state.maxItems}
                                 onChange={this.changeMaxItems}
                                 placeholder={_("unlimited")}/>
                </FormGroup>
            </Modal.Body>
        </Modal>
    }
}


function LocImage(props) {
    const [image, width, heigh] = props.image
    const uploadControl = <FormControl id="fileUpload"
                                       type="file"
                                       accept=".jpg, .png, .gif"
                                       value="" onChange={(e) => props.uploadCallback(e.target)}
                                       style={{display: "none"}}/>

    if (image) {
        return <div>
            <img id="locimage" style={{height: 100}} src={image}/>
            <div style={{display: "block"}}>
                { uploadControl }
                <ControlLabel htmlFor="fileUpload">
                    <Label bsStyle="success">{_("Change@@LocImage")}</Label>
                </ControlLabel>
                &nbsp;
                <Label onClick={props.removeCallback} bsStyle="danger">{_("Remove@@LocImage")}</Label>
            </div>
        </div>
    }
    else {
        return <div>
            { uploadControl }
            <ControlLabel htmlFor="fileUpload">
                <div style={{height: 100, width: 100, border: "thin solid",
                    verticalAlignment: "center", textAlign: "center" }}>
                    <Label bsStyle="success">{_("Add picture")}</Label>
                </div>
            </ControlLabel>
        </div>
    }
}


class LocationEditor extends React.Component {
    handleClose = () => {
        // Blockly doesn't hide this -- apparently we don't close it gently enough (or at all)
        Blockly.WidgetDiv.hide()
        Blockly.Tooltip.hide()
        this.props.handleClose()
    }

    get location() { return locations[this.props.location] }

    // TODO Blocks in the flyouts don't refresh. Discover how the are constructed
    handleTitleBlur = () => refreshDropdowns(this.props.location, locations[this.props.location].title)
    handleTitleKeyPress = e => { if (e.charCode == 13) { e.preventDefault(); e.stopPropagation(); e.target.blur() } }
    handleTitleChange = e => { this.location.setTitle(e.target.value); this.forceUpdate() }
    handleDescriptionChange = e => { this.location.setDescription(e.target.value); this.forceUpdate() }

    handleWorkspaceChange = () => {
        /* Listener remains active after the dialog is closed and may be triggered by, for instance,
           undo/redo, which uses workspaces to refresh some data.
           **This may have also caused overwriting of some location's block -- this bug was never fixed
             but disappeared by itself.**
        */
        if (this.location) {
            this.location.setWorkspace(Blockly.getMainWorkspace(), true)
        }
    }

    uploadImage = (control) => {
        const reader = new FileReader()
        reader.onload = e => {
            const img = new Image()
            img.onload = () => {
                const scale = Math.min(1, 600 / img.width, 450 / img.height)
                const width = img.width * scale
                const height = img.height * scale
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                const data = canvas.toDataURL()
                this.props.setLocationImage(this.props.location, data, width, height)
                control.value = ""
            }
            img.src = `data:image/png;base64,${btoa(e.target.result)}`
        }
        reader.readAsBinaryString(control.files[0])
    }

    removeImage = () => {
        this.props.setLocationImage(this.props.location, null)
    }

    removeLocation = () => {
        locations.removeLocation(this.props.location)
        this.props.handleClose()
    }

    handleEscape() {
        const locId = this.props.location
        const location = locations[locId]
        if (location.title.startsWith(_("New location")) && !location.description && !location.workspace)
            locations.removeLocation(locId)
    }

    render() {
        const loc = locations[this.props.location]
        if (!loc) return null;

        const isSpecial = locations.isSpecial(loc)

        const setToStart = () => {
            if (isSpecial)
                return ""
            else if (this.props.isInitial)
                return <Label bsStyle="default">{_("Start Location")}</Label>
            else
                return <Label onClick={() => this.props.setStartLocation(loc)} bsStyle="success">{_("Set as Start Location")}</Label>
        }

        const deleteButton = () => {
            const canRemove = locations.checkRemoveLocation(this.props.location)
            if (canRemove === false)
                return ""
            if (canRemove === true)
                return <Label onClick={this.removeLocation} bsStyle="danger">{_("Remove Location")}</Label>
            let usedStr = canRemove.join(", ")
            let tooltip
            if (usedStr.length > 200) {
                usedStr = usedStr.slice(0, 196) + " ..."
                tooltip = canRemove.join("<br/>")
            }
            else { tooltip = "" }
            return <p tooltip={tooltip}><small>{_("Used at") + " " + usedStr}</small></p>
        }

        return <Modal dialogClassName="location-editor" show={true}
                      onHide={this.handleClose}
                      onEscapeKeyDown={() => this.handleEscape()}
                      enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <Media>
                        <Media.Left>
                            <div style={{ fontSize: "75%", marginRight: "1em" }}>
                                {isSpecial ? ""
                                    : <LocImage image={loc.image}
                                                uploadCallback={this.uploadImage}
                                                removeCallback={this.removeImage}/>
                                }
                            </div>
                        </Media.Left>
                        <Media.Body>
                            <FormControl type="text"
                                         bsSize="large"
                                         value={locations[this.props.location].title}
                                         onKeyPress={this.handleTitleKeyPress}
                                         onChange={this.handleTitleChange}
                                         onBlur={this.handleTitleBlur}
                                         placeholder={_("Location name ...")}
                                         inputRef={ ref => {
                                             if (ref && this.props.selectTitle) {
                                                 ref.select()
                                                 ref.addEventListener('select', this.props.onTitleSelectionChange)
                                             } }}/>
                            { setToStart() }
                            { deleteButton() }
                        </Media.Body>
                    </Media>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FormControl componentClass="textarea"
                             className="loc-description"
                             placeholder={_("Location description ...")}
                             defaultValue={loc.description}
                             readOnly={locations.isSpecial(loc)}
                             onChange={this.handleDescriptionChange} />
                <BlocklyDrawerWithNameCheck
                    tools={blocks}
                    workspaceXML={loc.workspace || ""}
                    onChange={this.handleWorkspaceChange}
                    injectOptions={{toolboxPosition: 'end'/*, media: './'*/}}>
                </BlocklyDrawerWithNameCheck>
            </Modal.Body>
        </Modal>
    }
}


export default class Creator extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            editing: null,
            selectTitle: false,
            editSettings: false,
            modal: ""
        }
        this.openSettingsEditor = this.openSettingsEditor.bind()
    }

    warnOnLeavePage = e => {
        const confirmationMessage = _("Leave the page and lose your changes?");
        (e || window.event).returnValue = confirmationMessage //Gecko + IE
        return confirmationMessage //Gecko + Webkit, Safari, Chrome etc.
    }

    editLocation = (locId, selectTitle=false) => {
        Undo.putMark()
        this.setState({editing: locId, selectTitle})
        window.addEventListener("beforeunload", this.warnOnLeavePage)
    }

    onTitleSelectionChange = (e) => {
        if (document.activeElement == e.target)
            this.setState({selectTitle: false})
    }

    closeEditor = () => {
        this.setState({editing: null}, storeLocally)
        window.removeEventListener("beforeunload", this.warnOnLeavePage)
    }

    openSettingsEditor = () => this.setState({editSettings: true})
    closeSettingsEditor = () => { this.setState({editSettings: false}, storeLocally) }

    setStartLocation = (location, noUndoMark=false) => {
        if (!noUndoMark) {
            Undo.putMark()
        }
        locations.setStartLocation(location.locId)
        this.setState(this.state)
        storeLocally()
    }

    setLocationImage = (location, image, width, height) => {
        locations[location].setImage([image || "", width, height])
        this.setState(this.state)
        storeLocally()
    }

    resetData = () => {
        this.setState({modal:
                <Modal.Dialog>
                    <Modal.Header>
                        <Modal.Title>{_("Delete Game")}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {_("Delete the game?")}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={() => { saveGame(); resetData(); this.setState({modal: ""})}}>
                        {_("Save and Delete")}
                        </Button>
                        <Button onClick={() => { resetData(); this.setState({modal: ""})}}>
                        {_("Delete without Saving")}
                        </Button>
                        <Button onClick={() => this.setState({modal: ""})}>
                        {_("Oh, no, don't!")}
                        </Button>
                    </Modal.Footer>
                </Modal.Dialog>})
    }

    resetLanguage = () => {
        createBlocks()
        this.forceUpdate()
    }

    render = () =>
        <div>
            {this.state.modal}
            <Navbar>
                <Navbar.Header>
                    <Navbar.Brand>
                        {_("Odyssey")}
                    </Navbar.Brand>
                </Navbar.Header>
                <Navbar.Form pullRight>
                    <FormControl id="gameUpload"
                                 type="file"
                                 accept=".game,.json"
                                 value="" onChange={e => loadGame(e.target.files[0], () => this.forceUpdate()) }
                                 style={{display: "none"}}/>
                    <ButtonToolbar className="with-labels">
                        <ButtonGroup>
                            <Label onClick={() => this.props.switchToPlay(true)}>{_("Test")}</Label>
                            <Label onClick={() => this.props.switchToPlay(false)}>{_("Play")}</Label>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Label onClick={saveGame}>{_("Save Game")}</Label>
                            <ControlLabel htmlFor="gameUpload" className="no-round-right no-round-left">
                                <Label>{_("Load Game")}</Label>
                            </ControlLabel>
                            <Label onClick={packGame} className="no-round-right no-round-left">{_("Pack Game")}</Label>
                            <Label onClick={this.resetData}>{_("Delete Game")}</Label>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Label onClick={this.openSettingsEditor}>{_("Game Settings")}</Label>
                        </ButtonGroup>
                        <LanguageSelector resetGUI={this.resetLanguage}/>
                    </ButtonToolbar>
                </Navbar.Form>
            </Navbar>
            <LocationEditor
                location={this.state.editing}
                isInitial={this.state.editing == locations.startLocation}
                selectTitle={this.state.selectTitle}
                onTitleSelectionChange={this.onTitleSelectionChange}
                handleClose={this.closeEditor}
                setLocationImage={this.setLocationImage}
                setStartLocation={locId => this.setStartLocation(locId, false)}
            />
            <SettingsEditor show={this.state.editSettings} closeHandler={this.closeSettingsEditor}/>
            <GameMap onEditLocation={this.editLocation} onAsInitial={this.setStartLocation}/>
        </div>
}

// TODO Copy media to another directory, fix the link and the configuration
