import React from 'react'
import { render } from 'react-dom'
import Blockly from 'node-blockly/browser'
import BlocklyDrawer, { Category } from 'react-blockly-drawer';

import { locations } from './quill'
import blocks from './createBlocks'

import pen_image from './pen-15.svg'
import cross_image from './cross.svg'

Blockly.BlockSvg.START_HAT = true
Blockly.Flyout.prototype.autoClose = false

window.React = React



class Location extends React.Component {
    constructor(props) {
        super(props)

        this.renaming = false
        this.startRename = this.startRename.bind(this)
        this.endRename = this.endRename.bind(this)
    }
    startRename() {
        this.renaming = true
        this.locname.setAttribute("contentEditable", "true")
        this.locname.focus()
    }

    endRename() {
        if (!this.renaming) return;
        this.renaming = false
        this.locname.setAttribute("contentEditable", "false")
        this.props.onRename(this.locname.innerText)
    }

    render() {
        var { location, onSelect, onRename, onRemove, isSelected, noButtons } = this.props

        return (
            <li className={isSelected ? "ui-selected" : ""}>
                <img className="button" onClick={onRemove} src={cross_image}/>
                <img className="button" onClick={this.startRename} src={pen_image}/>
                <span className="name"
                      onClick={this.props.isSelected ? this.startRename : onSelect}
                      onBlur={this.endRename}
                      onKeyPress={ev => { if (ev.key == "Enter") this.endRename() } }
                      ref={node => { this.locname = node }}>
                    {location}
                </span>
            </li>
        )
    }
}


const Locations = ({currentLocation, onSelect, onRename, onRemove, onAddNew}) =>
    <ol id="locations">
        {locations.getNames().map((loc, i) =>
            <Location key={i}
                      onSelect={() => onSelect(i)}
                      onRename={newName => onRename(i, newName)}
                      onRemove={() => onRemove(i)}
                      location={loc}
                      isSelected={i==currentLocation}/>)}
        <li onClick={onAddNew}>Dodaj novo lokacijo</li>
    </ol>


class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            currentLocation: 0
        }
        this.changeLocation = this.changeLocation.bind(this)
        this.removeLocation = this.removeLocation.bind(this)
        this.renameLocation = this.renameLocation.bind(this)
        this.addLocation = this.addLocation.bind(this)
    }

    get curLoc() { return locations.getLocation(this.state.currentLocation) }

    changeLocation(newLocation) {
        this.setState({currentLocation: newLocation})
    }

    changeWorkspace(xml) {
        this.curLoc.workspace = xml
    }

    changeDescription(event) {
        this.curLoc.description = event.target.value
        this.setState(this.state)
    }

    renameLocation(location, newName) {
        locations.renameLocation(location, newName)
        this.setState(this.state)
    }

    addLocation() {
        locations.addLocation()
        this.setState({currentLocation: locations.length - 1})
    }

    removeLocation(location) {
        if (locations.length == 1) return;
        locations.removeLocation(location)
        let currentLocation = this.state.currentLocation
        if (currentLocation > location) currentLocation--;
        this.setState({currentLocation})  // reset list of locations
    }

    render() {
        const currentLocation = this.state.currentLocation
        return (
            <div>
                <div id="locs-div">
                    <Locations currentLocation={currentLocation}
                               onSelect={this.changeLocation}
                               onRename={this.renameLocation}
                               onRemove={this.removeLocation}
                               onAddNew={this.addLocation} />
                </div>
                <div id="loc-desc-div">
                    <div>
                        <textarea id="loc-desc" rows="8" placeholder="Opis lokacije ..."
                                  value={this.curLoc.description}
                                  onChange={this.changeDescription.bind(this)}
                                  ref={node => { this.locDescArea = node } }/>
                    </div>
                    <div id="blockly-div">
                        <BlocklyDrawer tools={blocks}
                                       workspaceXML={this.curLoc.workspace || ""}
                                       injectOptions={{toolboxPosition: 'end'}}
                                       onChange={this.changeWorkspace.bind(this)}>
                            <Category name="Stvari" id="items" colour="186" custom="ITEMS"></Category>
                            <Category name="Spremenljivke" colour="330" custom="VARIABLES"></Category>
                        </BlocklyDrawer>,
                    </div>
                </div>
            </div>
        )
    }
}

render(<App/>, document.getElementById('react-container'))