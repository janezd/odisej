import React from "react"
import ReactSVG from 'react-svg'
import { Modal, FormGroup, FormControl, ControlLabel, Input, Label } from 'react-bootstrap'

import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'

import blocks, { exitBlock } from './createBlocks'
import { locations, items, restoreLocally, storeLocally, packBlockArgs } from './quill'

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
    }

    onResize() {
      this.content.style.left = '0px';
      this.content.style.top = '0px';
      this.content.style.width = '100%';
      this.content.style.height = this.wrapper.offsetHeight + 'px';
      this.content.style.position = "relative"
    }
}

const D=30


class Node extends React.Component {
    polyMouseDown = (e) => {
        this.coords = { x: e.pageX, y: e.pageY }
        document.addEventListener('mousemove', this.polyMouseMove)
    }

    polyMouseUp = () => {
        document.removeEventListener('mousemove', this.polyMouseMove)
    }

    polyMouseMove = (e) => {
        const xDiff = this.coords.x - e.pageX
        const yDiff = this.coords.y - e.pageY
        this.coords.x = e.pageX
        this.coords.y = e.pageY
        this.props.moveByCallback(this, -xDiff, -yDiff)
    }

    render() {
        const loc = locations.getLocation(this.props.locId)
        const insideCb = this.props.insideCallback

        return <g transform={`translate(${loc.x} ${loc.y})`}>
                    <text x="52" y="115" textAnchor="middle" fontFamily="sans-serif" style={{userSelect: 'none'}}>
                        {loc.title}
                    </text>
                    <g pointerEvents="all">
                        <polygon
                            fill="#FFFFFF"
                            points="36.761,89.896 14.751,67.887 14.751,36.761 36.761,14.751 67.887,14.751 89.896,36.761 89.896,67.887 67.887,89.896"
                        />
                        <clipPath id="hexagon-clip">
                            <polygon
                                fill="#FFFFFF"
                                points="36.761,89.896 14.751,67.887 14.751,36.761 36.761,14.751 67.887,14.751 89.896,36.761 89.896,67.887 67.887,89.896"
                            />
                        </clipPath>
                        <image width="105" height="105" href={loc.image} clipPath="url(#hexagon-clip)"
                               style={{cursor: 'move'}}
                               onDoubleClick={this.props.onDoubleClick}
                               onMouseDown={this.polyMouseDown}
                               onMouseUp={this.polyMouseUp}
                               onMouseEnter={() => insideCb(this) }
                               onMouseLeave={() => insideCb(null) }
                        />

                        <path d="M67.887,90.896H36.761c-0.265,0-0.52-0.105-0.707-0.293l-22.01-22.01c-0.188-0.188-0.293-0.442-0.293-0.707V36.761
                            c0-0.265,0.105-0.52,0.293-0.707l22.01-22.01c0.188-0.188,0.442-0.293,0.707-0.293h31.126c0.265,0,0.52,0.105,0.707,0.293
                            l22.01,22.01c0.188,0.188,0.293,0.442,0.293,0.707v31.126c0,0.265-0.105,0.52-0.293,0.707l-22.01,22.01
                            C68.406,90.791,68.152,90.896,67.887,90.896z M37.175,88.896h30.298l21.424-21.424V37.175L67.473,15.751H37.175L15.751,37.175
                            v30.298L37.175,88.896z"/>
                    </g>
                    <g pointerEvents="all">{
                        [{direction: "nw", x: 12.982, y:5.138,   width: 16, height:31.689, transform:"matrix(0.7071 0.7071 -0.7071 0.7071 20.9821 -8.6909)"},
                         {direction: "w",             y: 36.479, width: 16, height: 31.688},
                         {direction: "sw", x:  5.137, y: 75.665, width: 31.689, height: 16, transform: "matrix(0.7071 0.7071 -0.7071 0.7071 65.3066 9.669)"},
                         {direction: "s",  x: 36.479, y: 88.647, width: 31.688, height: 16},
                         {direction: "se", x: 75.666, y: 67.821, width: 16, height: 31.689, transform: "matrix(0.7071 0.7071 -0.7071 0.7071 83.6654 -34.6555)"},
                         {direction: "e",  x: 88.647, y: 36.479, width: 16, height: 31.688},
                         {direction: "ne", x: 67.821, y: 12.982, width: 31.689, height: 16, transform: "matrix(0.7071 0.7071 -0.7071 0.7071 39.3425 -53.0154)"},
                         {direction: "n",  x: 36.471,            width: 31.706, height: 16}
                        ].map(({direction, x, y, width, height, transform}) =>
                            <rect x={x} y={y} width={width} height={height} transform={transform} fill="none"
                                  onMouseDown={(e) => {this.props.newLineCallback(this, direction, e)}}
                                  onMouseEnter={() => insideCb(this, direction) }
                                  onMouseLeave={() => insideCb(null) }
                                  style={{cursor: direction + '-resize'}} />)}
                    </g>
        </g>
    }
}



function LocImage(props) {
    const image = props.image
    return <div>
        { image
            ? <img id="locimage" style={{ height: 100 }} src={ image } />
            : <div style= {{ height: 100, width: 100, border: "thin solid"}}/> }
        <FormControl id="fileUpload"
                     type="file"
                     accept=".jpg"
                     onChange={(e) => props.uploadCallback(e.target.files)} style={{ display: "none" }} />
        <div style={{display: "block"}}>
        <ControlLabel htmlFor="fileUpload">
            <Label bsStyle="success">{ image ? "Zamenjaj" : "Dodaj sliko" }</Label>
        </ControlLabel>
        &nbsp;
        { image ? <Label onClick={props.removeCallback} bsStyle="danger">Odstrani</Label> : ""}
        </div>
    </div>
}

const S2 = Math.sqrt(2) / 2

const CONN_COORDS = {
    'nw': {dx: -S2, dy: -S2, x: 20.982, y: 20.982},
    'w':  {dx:  -1, dy:   0, x:      8, y: 52.323},
    'sw': {dx: -S2, dy:  S2, x: 20.982, y: 83.665},
    's':  {dx:   0, dy:   1, x: 52.323, y: 96.647},
    'se': {dx:  S2, dy:  S2, x: 83.665, y: 83.665},
    'e':  {dx:   1, dy:   0, x: 96.647, y: 52.323},
    'ne': {dx:  S2, dy: -S2, x: 83.665, y: 20.982},
    'n':  {dx:   0, dy:  -1, x: 52.323, y:      8}}

const CENTER = 104.647 / 2

class LocationEditor extends React.Component {
    changeWorkspace(xml) {
        this.props.location.workspace = xml
    }

    handleClose() {
        const loc = this.props.location
        loc.title = this.loctitle.innerText
        loc.description = this.locDescArea.value
        storeLocally()

        this.props.handleClose()
    }

    uploadImage(files) {
        const reader = new FileReader()
        reader.onload = e => this.props.setLocationImage(this.props.location, e.target.result)
        reader.readAsBinaryString(files[0])
    }

    removeImage() {
        this.props.setLocationImage(this.props.location, null)
    }

    removeLocation() {
        locations.removeLocation(this.props.location)
        storeLocally()
        this.props.handleClose()
    }

    render() {
        if (!this.props.location) return null;

        const loc = this.props.location
        return <Modal dialogClassName="location-editor" show={true} onHide={this.handleClose.bind(this)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <div style={{ float: "left", fontSize: "75%", marginRight: "1em" }}>
                            <LocImage image={loc.image}
                                      uploadCallback={this.uploadImage.bind(this)}
                                      removeCallback={this.removeImage.bind(this)} />
                        </div>
                        <div ref={node => { this.loctitle = node; if (node) { node.setAttribute("contentEditable", true) }}}>
                            {loc.title}
                        </div>
                        <Label onClick={this.removeLocation.bind(this)} bsStyle="danger">Pobriši lokacijo</Label>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FormControl componentClass="textarea"
                                 placeholder="Opis lokacije ..."
                                 defaultValue={loc.description}
                                 inputRef={node => { this.locDescArea = node }}
                    />
                    <div id="blockly-div">
                        <BlocklyDrawerWithNameCheck tools={blocks}
                                                    workspaceXML={loc.workspace || ""}
                                                    injectOptions={{toolboxPosition: 'end'}}
                                                    onChange={this.changeWorkspace.bind(this)}>
                        </BlocklyDrawerWithNameCheck>
                    </div>
                </Modal.Body>
            </Modal>
    }
}

class Connection extends React.Component {
    shouldComponentUpdate(nextProps, nextState) {
        return true
    }

    render() {
        const { src, dir, dest, backDir } = this.props
        const srcLoc = locations.getLocation(src)
        let { dx, dy, x, y} = CONN_COORDS[dir]
        const x0 = srcLoc.x + x
        const y0 = srcLoc.y + y
        dx *= D
        dy *= D

        const destLoc = locations.getLocation(dest)
        let x1 = destLoc.x
        let y1 = destLoc.y
        let dx1 = 0
        let dy1 = 0
        let destCirc = ""
        if (backDir) {
            let { dx, dy, x, y} = CONN_COORDS[backDir]
            x1 += x
            y1 += y
            dx1 = dx * D
            dy1 = dy * D
            destCirc = <circle cx={x1} cy={y1} r={5} />
        }
        else {
            x1 += CENTER
            y1 += CENTER
        }

        return <g>
            <path stroke="transparent" strokeWidth="6" fill="transparent" d={`M${x0},${y0} C ${x0+dx},${y0+dy} ${x1+dx1},${y1+dy1} ${x1},${y1}`}
                  onClick={() => this.props.clickCallback(this) }/>
            <path stroke="#000000" strokeWidth="3" fill="transparent" d={`M${x0},${y0} C ${x0+dx},${y0+dy} ${x1+dx1},${y1+dy1} ${x1},${y1}`}
                  onClick={() => this.props.clickCallback(this) }/>
            <circle cx={x0} cy={y0} r={5}/>
            {destCirc}
            </g>
    }
}

const TempConnection = (props) => {
    if (!props.line) return null;
    let { x, y, dx, dy, mx, my} = props.line
    return <g>
        <circle cx={x} cy={y} r={5}/>
        <path pointerEvents="none" stroke="#000000" strokeWidth="3" fill="transparent" d={`M${x},${y} C ${x + dx * D},${y + dy * D} ${mx},${my} ${mx},${my}`}/>
    </g>
}

export default class GameMap extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            newLine: null,
            editing: null
        }
        this.dirMouseDown = this.dirMouseDown.bind(this)
        this.dirMouseUp = this.dirMouseUp.bind(this)
        this.dirMouseMove = this.dirMouseMove.bind(this)

        this.currentlyHovered = null
        this.setHovered = this.setHovered.bind(this)

        this.moveNodeBy = this.moveNodeBy.bind(this)
        this.setLocationImage = this.setLocationImage.bind(this)
    }

    setHovered(node, dir) {
        this.currentlyHovered = node
        this.hoveredDirection = dir
    }

    moveNodeBy(node, xDiff, yDiff) {
        const loc = locations.getLocation(node.props.locId)
        loc.x += xDiff
        loc.y += yDiff
        this.setState(this.state)
    }

    dirMouseDown(node, dir, e) {
        let {x, y, dx, dy} = CONN_COORDS[dir]
        const loc = locations.getLocation(node.props.locId)
        x += loc.x
        y += loc.y
        this.setState({newLine: {node, dir, x, y, dx, dy, mx: e.clientX - this.offsetX, my: e.clientY - this.offsetY}})
        document.addEventListener('mousemove', this.dirMouseMove);
        document.addEventListener('mouseup', this.dirMouseUp);
    }

    dirMouseUp(e) {
        const { node, dir } = this.state.newLine
        const srcLoc = locations.getLocation(node.props.locId)
        const dest = this.currentlyHovered
        const destLoc = dest && locations.getLocation(dest.props.locId) || this.newLocation(e)

        if (!destLoc) {
            delete srcLoc.directions[dir]
        }
        else {
            srcLoc.directions[dir] = destLoc.locId
        }
        if (this.hoveredDirection) {
            destLoc.directions[this.hoveredDirection] = srcLoc.locId
        }

        this.setState({newLine: null})
        document.removeEventListener('mousemove', this.dirMouseMove)
        document.removeEventListener('mouseup', this.dirMouseUp)
        e.stopPropagation()
    }

    dirMouseMove(e) {
        const newLine = this.state.newLine
        newLine.mx = e.clientX - this.offsetX
        newLine.my = e.clientY - this.offsetY
        this.setState({newLine})
    }

    removeConnection(conn) {
        const { src, dir, dest, backDir } = conn.props
        delete locations.getLocation(src).directions[dir]
        if (backDir) {
            delete locations.getLocation(dest).directions[backDir]
        }
        this.setState(this.state)
    }

    editLocation(locId) {
        this.setState({editing: locations.getLocation(locId)})
    }

    closeEditor() {
        this.setState({editing: null})
    }

    newLocation(e) {
        const newLoc = locations.addLocation()
        newLoc.x = e.clientX - this.offsetX - 56
        newLoc.y = e.clientY - this.offsetY - 56
        this.setState(this.state)
        return newLoc
    }

    setLocationImage(location, image) {
        location.image = image ? `data:image/jpeg;base64, ${btoa(image)}` : ""
        this.setState(this.state)
    }

    shouldComponentUpdate(nextProps, nextState) {
        return true
    }

    get offsetX() { return document.getElementById("gamemap").getBoundingClientRect().x }
    get offsetY() { return document.getElementById("gamemap").getBoundingClientRect().y }

    render() {
        return <div>
          <LocationEditor
              location={this.state.editing}
              handleClose={this.closeEditor.bind(this)}
              setLocationImage={this.setLocationImage}
          />
          <svg width="100%" height="600" id="gamemap" onDoubleClick={e => { this.newLocation(e); e.preventDefault();e.stopPropagation() } }>
            { Array.prototype.concat(
                ...locations
                    .getIds()
                    .map(srcId => {
                        const srcDirections = locations.getLocation(srcId).directions
                        return Object
                            .entries(srcDirections)
                            .map(([dir, destId]) => {
                                const multipleToDest = Object.values(srcDirections)
                                                             .filter(it => it == destId).length > 1
                                const destLoc = locations.getLocation(destId)
                                const backConnections = Object.entries(destLoc.directions)
                                                              .filter(([dir, destDestId]) => destDestId == srcId)
                                if (destId != srcId && !multipleToDest && backConnections.length == 1) {
                                    if (srcId < destId) {
                                        return <Connection key={srcId + dir}
                                                        src={srcId} dir={dir}
                                                        dest={destId} backDir={backConnections[0][0]}
                                                        clickCallback={this.removeConnection.bind(this)} />
                                    }
                                }
                                else {
                                    return <Connection key={srcId + dir} src={srcId} dir={dir} dest={destId}
                                                       clickCallback={this.removeConnection.bind(this)} />
                                }
                            })
                    })
             )}
            { locations.getIds().map(it => <Node key={it} locId={it}
                                                 newLineCallback={this.dirMouseDown}
                                                 insideCallback={this.setHovered}
                                                 moveByCallback={this.moveNodeBy}
                                                 onDoubleClick={e => { this.editLocation(it); e.preventDefault();e.stopPropagation() } }
                                    />) }
            <TempConnection line={this.state.newLine} />
          </svg>
          </div>
      }

    packData() {
        const locData = locations.getIds().map(it => {
            const location = locations.getLocation(it)
            let locBlocks = []
            if (location.workspace) {
                const workspace = new Blockly.Workspace()
                const xml = Blockly.Xml.textToDom(location.workspace)
                Blockly.Xml.domToWorkspace(xml, workspace)
                locBlocks = workspace.getTopBlocks().map(block => packBlockArgs(block))
            }
            return {name: location.title, description: location.description,
                    directions: location.directions, commands: locBlocks}
        })
        return {locations: locData, items: items.getNames()}
    }
}

restoreLocally()