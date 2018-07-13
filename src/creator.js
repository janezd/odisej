import React from "react"
import { Modal, FormGroup, FormControl, ControlLabel, Input, Label, Button, Checkbox, Navbar, ButtonToolbar } from 'react-bootstrap'

import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'

import blocks from './createBlocks'
import { refreshDropdowns } from './createBlocks'
import { locations, items, flags, variables, restoreLocally, storeLocally, gameSettings, saveGame, loadGame } from './quill'
import GameMap from './map.js'

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
    "Kaj imam?": "showInventory",
    "Odlaganje stvari": "dropItems",
    "Pobiranje stvari": "takeItems"
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
                    <FormControl id="inventory-size-limit"
                                 type="text"
                                 value={this.state.gameTitle}
                                 onChange={this.changeGameTitle}
                                 placeholder="Odisej"/>
                    <ControlLabel>Dodatni ukazi</ControlLabel>
                    { Object.entries(systemCommandsSettings).map(([name, setting]) =>
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
    const image = props.image
    const uploadControl = <FormControl id="fileUpload"
                                       type="file"
                                       accept=".jpg, .png, .gif"
                                       onChange={(e) => props.uploadCallback(e.target.files)}
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
    constructor(props) {
        super(props)
        this.onTitleBlur = this.onTitleBlur.bind(this)
    }

    handleClose = () => {
        const loc = locations[this.props.location]
        loc.title = this.loctitle.innerText
        loc.description = this.locDescArea.value
        loc.updateFromWorkspace(Blockly.getMainWorkspace())
        // Blockly doesn't hide this -- apparently we don't close it gently enough (or at all)
        Blockly.WidgetDiv.hide()
        Blockly.Tooltip.hide()
        this.props.handleClose()
    }

    onTitleBlur() {
        const value = this.loctitle.innerText.split("\n").join(" ")
        this.loctitle.innerText = value
        refreshDropdowns(this.props.location, value)
        // TODO Blocks in the flyouts don't refresh. Discover how the are constucted
    }

    uploadImage= (files) => {
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
                this.props.setLocationImage(this.props.location, data)
            }
            img.src = `data:image/png;base64,${btoa(e.target.result)}`
        }
        reader.readAsBinaryString(files[0])
    }

    removeImage = () => {
        this.props.setLocationImage(this.props.location, null)
    }

    removeLocation = () => {
        locations.removeLocation(this.props.location)
        this.props.handleClose()
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
            if (this.props.isInitial || isSpecial)
                return ""
            const usedAt = locations.collectUses("usedLocations", this.props.location)[this.props.location]
            if (!usedAt || (usedAt.length == 0))
                return <Label onClick={this.removeLocation} bsStyle="danger">Pobriši lokacijo</Label>
            const usedNames = [...usedAt].map(id => locations[id].title)
            let usedStr = usedNames.join(", ")
            let tooltip
            if (usedStr.length > 200) {
                usedStr = usedStr.slice(0, 196) + " ..."
                tooltip = usedNames.join("<br/>")
            }
            else { tooltip = "" }
            return <p tooltip={tooltip}><small>Uporabljena na {usedStr}</small></p>
        }

        return <Modal dialogClassName="location-editor" show={true} onHide={this.handleClose} enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <div style={{ float: "left", fontSize: "75%", marginRight: "1em" }}>
                        {isSpecial ? ""
                            : <LocImage image={loc.image}
                                        uploadCallback={this.uploadImage}
                                        removeCallback={this.removeImage}/>
                        }
                    </div>
                    <div ref={node => {
                        this.loctitle = node
                        if (node) { node.setAttribute("contentEditable", !isSpecial) }}}
                         onBlur={this.onTitleBlur}>
                        {loc.title}
                    </div>
                    { setToStart() }
                    { deleteButton() }
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FormControl componentClass="textarea"
                             placeholder="Opis lokacije ..."
                             defaultValue={loc.description}
                             inputRef={node => { this.locDescArea = node }}
                />
                <BlocklyDrawerWithNameCheck
                    tools={blocks}
                    workspaceXML={loc.workspace || ""}
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
            editSettings: false
        }
        this.openSettingsEditor = this.openSettingsEditor.bind()
    }

    editLocation = (locId) => this.setState({editing: locId})
    closeEditor = () => this.setState({editing: null}, storeLocally)

    openSettingsEditor = () => this.setState({editSettings: true})
    closeSettingsEditor = () => { this.setState({editSettings: false}, storeLocally) }

    setStartLocation = (location) => {
        locations.startLocation = location.locId
        this.setState(this.state)
        storeLocally()
    }

    setLocationImage = (location, image) => {
        locations[location].image = image || ""
        this.setState(this.state)
        storeLocally()
    }

    render = () =>
        <div>
            <Navbar>
                <Navbar.Header>
                    <Navbar.Brand>
                        <Button onClick={this.resetData}>Pobriši vse</Button>
                        Odisej
                    </Navbar.Brand>
                </Navbar.Header>
                <Navbar.Form pullRight>
                    <ButtonToolbar>
                        <Button onClick={() => this.props.switchToPlay(true)}>Preskusi</Button>
                        <Button onClick={() => this.props.switchToPlay(false)}>Igraj</Button>
                        <Label onClick={saveGame}>Shrani</Label>
                        <FormControl id="gameUpload"
                                     type="file"
                                     accept=".json"
                                     onChange={e => loadGame(e.target.files[0], () => this.forceUpdate()) }
                                     style={{display: "none"}}/>
                        <ControlLabel htmlFor="gameUpload">
                            <Label>Naloži</Label>
                        </ControlLabel>
                        <Button onClick={this.openSettingsEditor}>Nastavitve igre</Button>
                    </ButtonToolbar>
                </Navbar.Form>
            </Navbar>
            <LocationEditor
                location={this.state.editing}
                isInitial={this.state.editing == locations.startLocation}
                handleClose={this.closeEditor}
                setLocationImage={this.setLocationImage}
                setStartLocation={this.setStartLocation}
            />
            <SettingsEditor show={this.state.editSettings} closeHandler={this.closeSettingsEditor}/>
            <GameMap onEditLocation={this.editLocation}/>
        </div>
}

// TODO Copy media to another directory, fix the link and the configuration
