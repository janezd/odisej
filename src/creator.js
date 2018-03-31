import React from 'react'
import { render } from 'react-dom'
import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'
import { ListGroup, ListGroupItem } from 'react-bootstrap'

import { locations, items, storeLocally, restoreLocally, packBlockArgs } from './quill'
import blocks, { exitBlock } from './createBlocks'

import pen_image from './pen-15.svg'
import cross_image from './cross.svg'

Blockly.BlockSvg.START_HAT = true
// Blockly.Flyout.prototype.autoClose = false

window.React = React



function fixWorkspaceNames(workspace) {
    workspace.getAllBlocks().forEach(block => {
        block.inputList.forEach(input => {
            input.fieldRow
                .filter(field => field.fixMissingName)
                .forEach(field => field.fixMissingName())
        })
    })
}


class BlocklyDrawerWithNameCheck extends BlocklyDrawer {
    componentDidUpdate() {
        // BlocklyDrawer.prototype.componentDidUpdate.apply(this)
        const workspace = this.workspacePlayground
        fixWorkspaceNames(workspace)
        if (!workspace.getAllBlocks().length) {
            var block = workspace.newBlock('exits')
            block.initSvg()
            block.render()
        }
    }
}


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
            <ListGroupItem active={isSelected}>
                <img className="button" onClick={onRemove} src={cross_image}/>
                <img className="button" onClick={this.startRename} src={pen_image}/>
                <span className="name"
                      onClick={this.props.isSelected ? this.startRename : onSelect}
                      onBlur={this.endRename}
                      onKeyPress={ev => { if (ev.key == "Enter") this.endRename() } }
                      ref={node => { this.locname = node }}>
                    {location}
                </span>
            </ListGroupItem>
        )
    }
}


const Locations = ({currentLocation, onSelect, onRename, onRemove, onAddNew}) =>
    <ListGroup id="locations">
        {locations.getNames().map((loc, i) =>
            <Location key={i}
                      onSelect={() => onSelect(i)}
                      onRename={newName => onRename(i, newName)}
                      onRemove={() => onRemove(i)}
                      location={loc}
                      isSelected={i==currentLocation}/>)}
        <ListGroupItem onClick={onAddNew}>Dodaj novo lokacijo</ListGroupItem>
    </ListGroup>



export default class Creator extends React.Component {
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

    get curLoc() {
        return locations.getLocation(this.state.currentLocation)
    }

    changeLocation(newLocation) {
        this.setState({currentLocation: newLocation})
    }

    changeWorkspace(xml) {
        this.curLoc.workspace = xml
        storeLocally()
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

    packData() {
        const locData = []
        for(let loci = 0; loci < locations.length; loci++) {
            const location = locations.getLocation(loci)

            const workspace = new Blockly.Workspace()
            const xml = Blockly.Xml.textToDom(location.workspace)
            Blockly.Xml.domToWorkspace(xml, workspace)
            const locBlocks = workspace.getTopBlocks().map(block => packBlockArgs(block))

            locData.push({name: location.title, description: location.description, commands: locBlocks})
        }
        return {locations: locData, items: items.getNames()}
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
                               onAddNew={this.addLocation}/>
                </div>
                <div id="loc-desc-div">
                    <div>
                        <textarea class="form-control" id="loc-desc" rows="8" placeholder="Opis lokacije ..."
                                  value={this.curLoc.description}
                                  onChange={this.changeDescription.bind(this)}
                                  ref={node => {
                                      this.locDescArea = node
                                  }}/>
                    </div>
                    <div id="blockly-div">
                        <BlocklyDrawerWithNameCheck tools={blocks}
                                                    workspaceXML={this.curLoc.workspace || ""}
                                                    injectOptions={{toolboxPosition: 'end'}}
                                                    onChange={this.changeWorkspace.bind(this)}>
                        </BlocklyDrawerWithNameCheck>
                    </div>
                </div>
            </div>
        )
    }
}


restoreLocally()
