import React from "react"
import ReactSVG from 'react-svg'
import { Modal, FormGroup, FormControl, ControlLabel } from 'react-bootstrap'

import Blockly from 'node-blockly/browser'
import BlocklyDrawer from 'react-blockly-drawer'

import blocks, { exitBlock } from './createBlocks'
import { locations, items, restoreLocally, storeLocally } from './quill'

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
      this.coords = {
        x: e.pageX,
        y: e.pageY
      }
      document.addEventListener('mousemove', this.polyMouseMove)
    };

    polyMouseUp = () => {
        document.removeEventListener('mousemove', this.polyMouseMove)
      this.coords = {};
    }

    polyMouseMove = (e) => {
      const xDiff = this.coords.x - e.pageX;
      const yDiff = this.coords.y - e.pageY;
      this.coords.x = e.pageX;
      this.coords.y = e.pageY;
      this.props.moveByCallback(this, -xDiff, -yDiff)
    }

    polyMouseEnter = () => { insidethis.mouseInside = true; console.log("in") }

    polyMouseLeave = () => { this.mouseInside = false; console.log("out") }

    render() {
        const ncb = this.props.newLineCallback
        const loc = locations.getLocation(this.props.locId)
        return (
        <g transform={`translate(${loc.x} ${loc.y})`}>
        <text x="52" y="115" textAnchor="middle" fontFamily="sans-serif" style={{'user-select': 'none'}}>
            {loc.title}
        </text>
<g>
	<polygon fill="#FFFFFF" points="36.761,89.896 14.751,67.887 14.751,36.761 36.761,14.751 67.887,14.751 89.896,36.761
        89.896,67.887 67.887,89.896"
        style={{cursor: 'move'}}
        onDoubleClick={this.props.onDoubleClick}
        onMouseDown={this.polyMouseDown}
        onMouseUp={this.polyMouseUp}
        onMouseEnter={() => this.props.insideCallback(this) }
        onMouseLeave={() => this.props.insideCallback(null) } />
	<path d="M67.887,90.896H36.761c-0.265,0-0.52-0.105-0.707-0.293l-22.01-22.01c-0.188-0.188-0.293-0.442-0.293-0.707V36.761
		c0-0.265,0.105-0.52,0.293-0.707l22.01-22.01c0.188-0.188,0.442-0.293,0.707-0.293h31.126c0.265,0,0.52,0.105,0.707,0.293
		l22.01,22.01c0.188,0.188,0.293,0.442,0.293,0.707v31.126c0,0.265-0.105,0.52-0.293,0.707l-22.01,22.01
		C68.406,90.791,68.152,90.896,67.887,90.896z M37.175,88.896h30.298l21.424-21.424V37.175L67.473,15.751H37.175L15.751,37.175
		v30.298L37.175,88.896z"/>
</g>
<g pointerEvents="none">
	<path d="M9.778,34.186c-0.512,0-1.023-0.195-1.414-0.586c-0.781-0.781-0.781-2.047,0-2.828L30.771,8.364
		c0.78-0.781,2.047-0.781,2.828,0c0.781,0.781,0.781,2.047,0,2.828L11.192,33.6C10.802,33.991,10.29,34.186,9.778,34.186z"/>
	<path d="M8,70.168c-1.104,0-2-0.896-2-2V36.479c0-1.104,0.896-2,2-2s2,0.896,2,2v31.688C10,69.272,9.104,70.168,8,70.168z"/>
	<path d="M32.186,96.869c-0.512,0-1.023-0.195-1.414-0.586L8.364,73.875c-0.781-0.781-0.781-2.047,0-2.828
		c0.78-0.781,2.047-0.781,2.828,0L33.6,93.455c0.781,0.781,0.781,2.047,0,2.828C33.209,96.674,32.697,96.869,32.186,96.869z"/>
	<path d="M68.168,98.647H36.479c-1.104,0-2-0.896-2-2s0.896-2,2-2h31.688c1.104,0,2,0.896,2,2S69.272,98.647,68.168,98.647z"/>
	<path d="M72.462,96.869c-0.512,0-1.023-0.195-1.414-0.586c-0.781-0.781-0.781-2.047,0-2.828l22.407-22.408
		c0.78-0.781,2.047-0.781,2.828,0c0.781,0.781,0.781,2.047,0,2.828L73.876,96.283C73.486,96.674,72.974,96.869,72.462,96.869z"/>
	<path d="M96.647,70.168c-1.104,0-2-0.896-2-2V36.479c0-1.104,0.896-2,2-2s2,0.896,2,2v31.688
		C98.647,69.272,97.752,70.168,96.647,70.168z"/>
	<path d="M94.869,34.186c-0.512,0-1.023-0.195-1.414-0.586L71.048,11.192c-0.781-0.781-0.781-2.047,0-2.828
		c0.78-0.781,2.047-0.781,2.828,0l22.407,22.408c0.781,0.781,0.781,2.047,0,2.828C95.893,33.991,95.381,34.186,94.869,34.186z"/>
	<path d="M68.177,10H36.471c-1.104,0-2-0.896-2-2s0.896-2,2-2h31.706c1.104,0,2,0.896,2,2S69.281,10,68.177,10z"/>
</g>
<g pointerEvents="all">
    <g id="dragNW"
       onMouseDown={(e) => {ncb(this, 'nw', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'nw') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'nw-resize'}}>
		<line fill="none" x1="9.778" y1="32.186" x2="32.186" y2="9.778"/>
        <rect x="12.982" y="5.138" transform="matrix(0.7071 0.7071 -0.7071 0.7071 20.9821 -8.6909)" fill="none" width="16" height="31.689"/>
	</g>
    <g id="dragW"
       onMouseDown={(e) => {ncb(this, 'w', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'w') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'w-resize'}}>
		<line fill="none" x1="8" y1="68.168" x2="8" y2="36.479"/>
		<rect y="36.479" fill="none" width="16" height="31.688"/>
	</g>
    <g id="dragSW"
       onMouseDown={(e) => {ncb(this, 'sw', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'sw') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'sw-resize'}}>
		<line fill="none" x1="32.186" y1="94.869" x2="9.778" y2="72.461"/>
    	<rect x="5.137" y="75.665" transform="matrix(0.7071 0.7071 -0.7071 0.7071 65.3066 9.669)" fill="none" width="31.689" height="16"/>
	</g>
    <g id="dragS"
       onMouseDown={(e) => {ncb(this, 's', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 's') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 's-resize'}}>
		<line fill="none" x1="68.168" y1="96.647" x2="36.479" y2="96.647"/>
		<rect x="36.479" y="88.647" fill="none" width="31.688" height="16"/>
	</g>
    <g id="dragSE"
       onMouseDown={(e) => {ncb(this, 'se', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'se') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'se-resize'}}>
		<line fill="none" x1="94.869" y1="72.461" x2="72.462" y2="94.869"/>

			<rect x="75.666" y="67.821" transform="matrix(0.7071 0.7071 -0.7071 0.7071 83.6654 -34.6555)" fill="none" width="16" height="31.689"/>
	</g>
    <g id="dragE"
       onMouseDown={(e) => {ncb(this, 'e', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'e') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'e-resize'}}>
       <line fill="none" x1="96.647" y1="36.479" x2="96.647" y2="68.168"/>
		<rect x="88.647" y="36.479" fill="none" width="16" height="31.688"/>
	</g>
    <g id="dragNE"
       onMouseDown={(e) => {ncb(this, 'ne', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'ne') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'ne-resize'}}>
		<line fill="none" x1="72.462" y1="9.778" x2="94.869" y2="32.186"/>
		<rect x="67.821" y="12.982" transform="matrix(0.7071 0.7071 -0.7071 0.7071 39.3425 -53.0154)" fill="none" width="31.689" height="16"/>
	</g>
    <g id="dragN"
       onMouseDown={(e) => {ncb(this, 'n', e)}}
       onMouseEnter={() => this.props.insideCallback(this, 'n') }
       onMouseLeave={() => this.props.insideCallback(null) }
       style={{cursor: 'n-resize'}}>
		<line fill="none" x1="36.471" y1="8" x2="68.177" y2="8"/>
		<rect x="36.471" fill="none" width="31.706" height="16"/>
	</g>
</g>
        </g>
      )
    }
  }


const S2=Math.sqrt(2) / 2

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

class LocationEditor extends ReactSVG {
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

    render() {
        const loc = this.props.location
        return <Modal dialogClassName="location-editor" show={true} onHide={this.handleClose.bind(this)}>
                <Modal.Header closeButton>
                    <Modal.Title><span ref={node => { this.loctitle = node; if (node) { node.setAttribute("contentEditable", true) }}}>{loc.title}</span></Modal.Title>
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

class Connection extends ReactSVG {
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

export default class GameMap extends ReactSVG {
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
        this.setState({newLine: {node, dir, x, y, dx, dy, mx: e.clientX, my: e.clientY}})
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
        newLine.mx = e.clientX
        newLine.my = e.clientY
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

    shouldComponentUpdate(nextProps, nextState) {
        return true
    }

    get offsetX() { return document.getElementById("gamemap").getBoundingClientRect().x }
    get offsetY() { return document.getElementById("gamemap").getBoundingClientRect().y }

    render() {
        let tempConnection = <g/>
        if (this.state.newLine) {
            let { x, y, dx, dy, mx, my} = this.state.newLine
            dx *= D
            dy *= D
            mx -= this.offsetX
            my -= this.offsetY
            tempConnection = <path pointerEvents="none" stroke="#000000" strokeWidth="3" fill="transparent" d={`M${x},${y} C ${x+dx},${y+dy} ${mx},${my} ${mx},${my}`}/>
        }

        const toEdit = this.state.editing ? <LocationEditor location={this.state.editing} handleClose={this.closeEditor.bind(this)} /> : ""

        return <div>
          {toEdit}
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
            {tempConnection}
          </svg>
          </div>
      }
}

function packData() {
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

restoreLocally()
