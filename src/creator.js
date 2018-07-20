import React from "react"
import { Modal, FormGroup, FormControl, ControlLabel, Input, Label, Button, Checkbox, Navbar, ButtonToolbar, Media, ButtonGroup } from 'react-bootstrap'

import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'

import blocks from './createBlocks'
import { refreshDropdowns } from './createBlocks'
import { locations, items, flags, variables,
         gameSettings, storeLocally, resetData, saveGame, loadGame } from './quill'
import GameMap from './map'

Blockly.BlockSvg.START_HAT = true
// Blockly.Flyout.prototype.autoClose = false

window.React = React


class BlocklyDrawerWithNameCheck extends BlocklyDrawer {
    onResize() {
        this.content.style.left = '0px';
        this.content.style.top = '0px';
        this.content.style.width = '100%';
        this.content.style.height = this.wrapper.offsetHeight + 'px';
        this.content.style.position = "relative"
    }
}


export const systemCommandsSettings = {
    showInventory: "Ukaz 'Kaj imam?'",
    dropItems: "Možnost odlaganja stvari (prek 'Kaj imam?')",
    takeItems: "Ukazi za jemanje stvari z lokacij"
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

    render() {
        if (!this.props.show) return null
        return <Modal dialogClassName="location-editor" show={true} onHide={this.onHide} enforceFocus={true}>
            <Modal.Header closeButton>
                <Modal.Title>Nastavitve igre</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FormGroup>
                    <ControlLabel>Ime igre</ControlLabel>
                    <FormControl id="game-title"
                                 type="text"
                                 bsSize="large"
                                 value={this.state.gameTitle}
                                 onChange={this.changeGameTitle}
                                 placeholder="Odisej"/>
                    <ControlLabel>Dodatni ukazi</ControlLabel>
                    { Object.entries(systemCommandsSettings).map(([setting, name]) =>
                        <Checkbox key={setting}
                                  checked={this.state[setting]}
                                  onChange={e => this.setState({[setting]: e.target.checked }) }>
                            {name}
                        </Checkbox>)
                    }
                    <ControlLabel>Največje število stvari, ki jih igralec lahko nosi (pusti prazno, če ne želiš omejitve)</ControlLabel>
                    <FormControl id="inventory-size-limit"
                                 type="text"
                                 value={this.state.maxItems}
                                 onChange={this.changeMaxItems}
                                 placeholder="neomejeno"/>
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
                    <Label bsStyle="success">Zamenjaj</Label>
                </ControlLabel>
                &nbsp;
                <Label onClick={props.removeCallback} bsStyle="danger">Odstrani</Label>
            </div>
        </div>
    }
    else {
        return <div>
            { uploadControl }
            <ControlLabel htmlFor="fileUpload">
                <div style={{height: 100, width: 100, border: "thin solid",
                    verticalAlignment: "center", textAlign: "center" }}>
                    <Label bsStyle="success">Dodaj sliko</Label>
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

    handleTitleChange = e => { this.location.title = e.target.value; this.forceUpdate() }
    handleDescriptionChange = e => { this.location.description = e.target.value; this.forceUpdate() }
    handleWorkspaceChange = () => this.location.updateFromWorkspace(Blockly.getMainWorkspace())

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

    handleKeyPress = e => {
        if (e.charCode == 13) {
            e.stopPropagation()
            this.handleClose()
        }
    }

    render() {
        const loc = locations[this.props.location]
        if (!loc) return null;

        const isSpecial = locations.isSpecial(loc)

        const setToStart = () => {
            if (isSpecial)
                return ""
            else if (this.props.isInitial)
                return <Label bsStyle="default">Začetna lokacija</Label>
            else
                return <Label onClick={() => this.props.setStartLocation(loc)} bsStyle="success">Nastavi kot začetno</Label>
        }

        const deleteButton = () => {
            const canRemove = locations.checkRemoveLocation(this.props.location)
            if (canRemove === false)
                return ""
            if (canRemove === true)
                return <Label onClick={this.removeLocation} bsStyle="danger">Pobriši lokacijo</Label>
            let usedStr = canRemove.join(", ")
            let tooltip
            if (usedStr.length > 200) {
                usedStr = usedStr.slice(0, 196) + " ..."
                tooltip = canRemove.join("<br/>")
            }
            else { tooltip = "" }
            return <p tooltip={tooltip}><small>Uporabljena na {usedStr}</small></p>
        }

        return <Modal dialogClassName="location-editor" show={true}
                      onHide={this.handleClose} onKeyPress={this.handleKeyPress}
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
                                         placeholder="Vnesi ime lokacije ..."
                                         inputRef={ e => {
                                             if (e && this.props.selectTitle) {
                                                 e.select()
                                                 e.addEventListener('select', this.props.onTitleSelectionChange)
                                             } }}/>
                            { setToStart() }
                            { deleteButton() }
                        </Media.Body>
                    </Media>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FormControl componentClass="textarea"
                             placeholder="Opis lokacije ..."
                             defaultValue={loc.description}
                             readOnly={locations.isSpecial(loc)}
                             onChange={this.handleDescriptionChange} />
                <BlocklyDrawerWithNameCheck
                    tools={blocks}
                    workspaceXML={loc.workspace || ""}
                    onChange={this.handleWorkspaceChange}
                    injectOptions={{toolboxPosition: 'end', media: './'}}>
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

    editLocation = (locId, selectTitle=false) => this.setState({editing: locId, selectTitle})
    closeEditor = () => this.setState({editing: null}, storeLocally)

    openSettingsEditor = () => this.setState({editSettings: true})
    closeSettingsEditor = () => { this.setState({editSettings: false}, storeLocally) }

    setStartLocation = (location) => {
        locations.startLocation = location.locId
        this.setState(this.state)
        storeLocally()
    }

    setLocationImage = (location, image, width, height) => {
        locations[location].image = [image || "", width, height]
        this.setState(this.state)
        storeLocally()
    }

    resetData = () => {
        this.setState({modal:
                <Modal.Dialog>
                    <Modal.Header>
                        <Modal.Title>Pobriši igro</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Pobrišem igro?
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={() => { saveGame(); resetData(); this.setState({modal: ""})}}>
                            Shrani in pobriši
                        </Button>
                        <Button onClick={() => { resetData(); this.setState({modal: ""})}}>
                            Pobriši brez milosti
                        </Button>
                        <Button onClick={() => this.setState({modal: ""})}>
                            Ups, ne
                        </Button>
                    </Modal.Footer>
                </Modal.Dialog>})
    }

    render = () =>
        <div>
            {this.state.modal}
            <Navbar>
                <Navbar.Header>
                    <Navbar.Brand>
                        Odisej
                    </Navbar.Brand>
                </Navbar.Header>
                <Navbar.Form pullRight>
                    <FormControl id="gameUpload"
                                 type="file"
                                 accept=".json"
                                 value="" onChange={e => loadGame(e.target.files[0], () => this.forceUpdate()) }
                                 style={{display: "none"}}/>
                    <ButtonToolbar className="with-labels">
                        <ButtonGroup>
                            <Label onClick={() => this.props.switchToPlay(true)}>Preskusi</Label>
                            <Label onClick={() => this.props.switchToPlay(false)}>Igraj</Label>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Label onClick={saveGame}>Shrani igro</Label>
                            <ControlLabel htmlFor="gameUpload" className="no-round-right no-round-left">
                                <Label>Naloži igro</Label>
                            </ControlLabel>
                            <Label onClick={this.resetData}>Pobriši igro</Label>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Label onClick={this.openSettingsEditor}>Nastavitve igre</Label>
                        </ButtonGroup>
                    </ButtonToolbar>
                </Navbar.Form>
            </Navbar>
            <LocationEditor
                location={this.state.editing}
                isInitial={this.state.editing == locations.startLocation}
                selectTitle={this.state.selectTitle}
                onTitleSelectionChange={() => this.setState({selectTitle: false})}
                handleClose={this.closeEditor}
                setLocationImage={this.setLocationImage}
                setStartLocation={this.setStartLocation}
            />
            <SettingsEditor show={this.state.editSettings} closeHandler={this.closeSettingsEditor}/>
            <GameMap onEditLocation={this.editLocation} onAsInitial={this.setStartLocation}/>
        </div>
}

// TODO Copy media to another directory, fix the link and the configuration
