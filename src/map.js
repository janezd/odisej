import React from "react"
import { locations, storeLocally, undoStack, redoStack } from './quill'

import { MenuItem, Popover} from "react-bootstrap"

const D=30


const questionPng="data:image/.png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAABpCAYAAAA5gg06AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfxJREFUeNrs289RAjEYhvEVPXi0BO1AK9AStAK1A0rACiwBO5AOxAqwg6UDuHrSMC4z6CgQ/oREfs/MO14k4Pf4ZZPs0qqQPS0lIAkkkQSSQBJJIAkkkQSSSAJJIIkkkASSSAJJIIkkkEQSSAJJJIEkkEQSSCIJeXJU+Oc/CTkPuZrzO8MmfbrTimmHDEI+IjIK6S4Qig3QaYr9sWZemg7EhrtnsAE5P3OntHkLmuZRidfnZYuCdNQGaCcQNF1UnORahMPMp7nnkOME7zV5j/dcl+k5b2avE/933zpx2H7ReiEXIQdNbkLGEa8/bYIIYq4pnT/GuIocx0Y3gpji1gvGGpUuKdfpLuY0oLfEAqRocj1g7c0U93Kmu37jdcExUgzjHItxUOhUOPvzqfo65f7JZIPajRh3MsaZK006HlfY0HaULe0GOFZQ/R+uXaUIWuUgdlS5bZGEU4Ly76ARQXmzSgfVBKWjU61269wiISF1pKCukqXf1O6FoJIfjoy5pvRD7knazapuWR5KnjL25THjPkl581b6H1Dys+BPS3bIuAJ00vwleMyUp6N2wN48YOJLZCSBJJJAEkgiCSThOyWfOMTcfhhSDdMdSSAJJJEEkkASSSAJJJEEkkgCSSCJJJAEkkgCSSQpAUkgiSSQBJJIAkkgiSSQtI98CjAAIS1L8fleihUAAAAASUVORK5CYII="

const Nodes = props =>
    locations.keys().map(locId => <Node
        key={locId} locId={locId}
        isInitial={locId == locations.startLocation}
        selected={props.selection.has(locId)}
        onNewLine={props.onNewLine}
        onHover={props.onHover}
        onMove={props.onMove}
        onEditLocation={() => props.onEditLocation(locId) }
        onSelectLocation={(select, add) => props.onSelectLocation(select ? locId : null, add) }
        onContextMenu={(x, y) => props.onContextMenu(locId, x, y)}
    />)


class Node extends React.Component {
    constructor(props) {
        super(props)
        this.didntMove = false
    }

    triggerContextMenu = e => {
        e.stopPropagation()
        e.preventDefault()
        this.props.onContextMenu(e.pageX, e.pageY)
    }

    polyMouseDown = (e) => {
        if (e.button != 0)
            return
        if (!e.shiftKey && !this.props.selected) {
            this.props.onSelectLocation(false)
        }
        this.coords = {x: e.pageX, y: e.pageY}
        this.travelled = {xDiff: 0, yDiff: 0}
        this.didntMove = true
        document.addEventListener('mousemove', this.polyMouseMove)
        e.stopPropagation()
    }

    polyMouseUp = (e) => {
        document.removeEventListener('mousemove', this.polyMouseMove)
        if (this.didntMove) {
            this.props.onSelectLocation(true, e.shiftKey)
        } else {
            const location = locations[this.props.locId]
            const {xDiff, yDiff} = this.travelled
            console.log("up")
            undoStack.push(
                [() => { location.x += xDiff; location.y += yDiff },
                 () => { location.x -= xDiff; location.y -= yDiff }])
            storeLocally()
        }
    }

    polyMouseMove = (e) => {
        const xDiff = this.coords.x - e.pageX
        const yDiff = this.coords.y - e.pageY
        if (this.didntMove && (xDiff ** 2 + yDiff ** 2 > 50)) {
            this.didntMove = false
            undoStack.push([null, null])
        }
        if (!this.didntMove) {
            this.coords.x = e.pageX
            this.coords.y = e.pageY
            this.travelled.xDiff += xDiff
            this.travelled.yDiff += yDiff
            this.props.onMove(this.props.locId, -xDiff, -yDiff)
        }
    }

    editLocation = (e) => {
        e.stopPropagation()
        this.props.onEditLocation()
    }

    render() {
        const loc = locations[this.props.locId]
        const isSpecial = locations.isSpecial(loc)
        const insideCb = (obj, dir) => { if (!isSpecial) this.props.onHover(obj, dir) }

        // Resize the image to fill the shape
        let [imgSrc, imgWidth, imgHeight] = loc.image
        let offx = 0
        let offy = 0
        if (!imgSrc) {
            if (!isSpecial) {
                imgSrc = questionPng
                imgWidth = imgHeight = 105
            }
        }
        else if (imgWidth < imgHeight) {
            imgHeight *= 105 / imgWidth
            offy = -(imgHeight - 105) / 2
            imgWidth = 105
        }
        else {
            imgWidth *= 105 / imgHeight
            offx = -(imgWidth - 105) / 2
            imgHeight = 105
        }

        return <g transform={`translate(${loc.x} ${loc.y})`}>
                    <text x="52" y="115" textAnchor="middle" fontFamily="sans-serif" style={{userSelect: 'none', cursor: 'text'}}
                          onClick={this.props.onEditLocation}>
                        {loc.title}
                    </text>
                    <g pointerEvents="all">
                        <path fill={ this.props.isInitial ? "green" : "gray" } stroke="transparent" strokeOpacity="0.8"
                              d="M67.887,90.896H36.761c-0.265,0-0.52-0.105-0.707-0.293l-22.01-22.01c-0.188-0.188-0.293-0.442-0.293-0.707V36.761
                            c0-0.265,0.105-0.52,0.293-0.707l22.01-22.01c0.188-0.188,0.442-0.293,0.707-0.293h31.126c0.265,0,0.52,0.105,0.707,0.293
                            l22.01,22.01c0.188,0.188,0.293,0.442,0.293,0.707v31.126c0,0.265-0.105,0.52-0.293,0.707l-22.01,22.01
                            C68.406,90.791,68.152,90.896,67.887,90.896z M37.175,88.896h30.298l21.424-21.424V37.175L67.473,15.751H37.175L15.751,37.175
                            v30.298L37.175,88.896z"
                        />
                        <polygon
                            stroke={this.props.selected ? "blue" : "transparent"}
                            strokeWidth={6}
                            fill={ isSpecial ? "#D0FFD0" : "#FFFFFF" }
                            points="36.761,89.896 14.751,67.887 14.751,36.761 36.761,14.751 67.887,14.751 89.896,36.761 89.896,67.887 67.887,89.896"
                        />
                        <clipPath id="hexagon-clip">
                            <polygon
                                fill="#FFFFFF"
                                points="36.761,89.896 14.751,67.887 14.751,36.761 36.761,14.751 67.887,14.751 89.896,36.761 89.896,67.887 67.887,89.896"
                            />
                        </clipPath>
                        <g clipPath="url(#hexagon-clip)">
                            <g transform={`translate(${offx}, ${offy})`}>
                                <image width={imgWidth} height={imgHeight} href={imgSrc}
                                       style={{cursor: 'move'}}
                                       onDoubleClick={this.editLocation}
                                       onMouseDown={this.polyMouseDown}
                                       onMouseUp={this.polyMouseUp}
                                       onMouseEnter={() => insideCb(this) }
                                       onMouseLeave={() => insideCb(null) }
                                       onContextMenu={this.triggerContextMenu}
                                />
                            </g>
                        </g>
                    </g>
            { isSpecial ? "" :
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
                            <rect key={direction}
                                  x={x} y={y} width={width} height={height} transform={transform} fill="none"
                                  onMouseDown={(e) => {this.props.onNewLine(this, direction, e)}}
                                  onMouseEnter={() => insideCb(this, direction) }
                                  onMouseLeave={() => insideCb(null) }
                                  style={loc.directions[direction] ? {} : {cursor: direction + '-resize'}} />)}
                    </g>}
        </g>
    }
}


class Connections extends React.Component {
    onRemoveConnection = (conn, direction) => {
        const {src, dir, dest, backDir} = conn.props
        undoStack.push([null, null])
        if (direction != -1)
            locations[src].removeConnection(dir)
        if (backDir && (direction != 1)) {
            locations[dest].removeConnection(backDir)
        }
        this.forceUpdate()
        storeLocally()
    }

    render = () =>
        locations.entries().map(([srcId, srcLoc]) => {
            const srcDirections = locations[srcId].directions
            return Object.entries(srcDirections)
                .map(([dir, destId]) => {
                    const destLoc = locations[destId]
                    const multipleToDest = Object.values(srcDirections)
                        .filter(dest => dest == destId).length > 1
                    const backConnections = Object.entries(destLoc.directions)
                        .filter(([dir, destDestId]) => destDestId == srcId)
                    if (destId != srcId && !multipleToDest && backConnections.length == 1) {
                        if (srcId < destId) {
                            return <Connection key={srcId + dir} src={srcId} dir={dir} dest={destId}
                                               backDir={backConnections[0][0]}
                                               onRemoveConnection={this.onRemoveConnection}/>
                        }
                    }
                    else {
                        return <Connection key={srcId + dir} src={srcId} dir={dir} dest={destId}
                                           onRemoveConnection={this.onRemoveConnection}/>
                    }
                })
        })
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


class Connection extends React.Component {
    constructor(props) {
        super(props)
        this.last = this.coordsDirs(props)
    }

    coordsDirs(props) {
        const { src, dir, dest, backDir } = this.props
        return [src.x, src.y, dest.x, dest.y, dir, backDir]
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.last != this.coordsDirs(nextProps)
    }

    render() {
        const { src, dir, dest, backDir } = this.props
        const srcLoc = locations[src]
        let { dx, dy, x, y} = CONN_COORDS[dir]
        const x0 = srcLoc.x + x
        const y0 = srcLoc.y + y
        dx *= D
        dy *= D

        const destLoc = locations[dest]
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
            destCirc = <circle cx={x1} cy={y1} z={-5} r={5} onClick={() => this.props.onRemoveConnection(this, -1)}/>
        }
        else {
            x1 += CENTER
            y1 += CENTER
        }

        return <g>
            <path stroke="transparent" strokeWidth="6" fill="transparent" d={`M${x0},${y0} C ${x0+dx},${y0+dy} ${x1+dx1},${y1+dy1} ${x1},${y1}`}
                  onClick={() => this.props.onRemoveConnection(this) }/>
            <path stroke="#000000" strokeWidth="3" fill="transparent" d={`M${x0},${y0} C ${x0+dx},${y0+dy} ${x1+dx1},${y1+dy1} ${x1},${y1}`}
                  onClick={() => this.props.onRemoveConnection(this) }/>
            <circle cx={x0} cy={y0} z={-5} r={5} onClick={() => this.props.onRemoveConnection(this, 1)}/>
            {destCirc}
            </g>
    }
}


const ImplicitConnections = () =>
    locations.values()
        .map(location => location.movesTo.map(dest => [location.locId, dest]))
        .reduce((acc, x) => acc.concat(x), [])
        .filter(([src, dest]) => src !== dest)
        .map(([src, dest]) => <ImplicitConnection key={src + ':' + dest} src={src} dest={dest}/>)


class ImplicitConnection extends React.Component {
    constructor(props) {
        super(props)
        this.last = this.coordsDirs(props)
    }

    coordsDirs = (props) => [this.props.src.x, this.props.src.y, this.props.dest.x, this.props.dest.y]
    shouldComponentUpdate = (nextProps) => this.last != this.coordsDirs(nextProps)

    render() {
        const src = locations[this.props.src]
        const dest = locations[this.props.dest]
        let x0 = src.x
        let y0 = src.y
        let x1 = dest.x
        let y1 = dest.y
        const phi = Math.atan2(y1 - y0, x1 - x0)
        x0 += CENTER + CENTER * Math.cos(phi)
        y0 += CENTER + CENTER * Math.sin(phi)
        x1 += CENTER - CENTER * Math.cos(phi)
        y1 += CENTER - CENTER * Math.sin(phi)
        return <g>
            <circle stroke="#bbbbbb" fill="#bbbbbb" cx={x0} cy={y0} r={5}/>
            <path stroke="#bbbbbb" strokeWidth="3" fill="transparent" d={`M${x0},${y0} L${x1},${y1}`}/>
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


class NodeContextMenu extends React.Component {
    render() {
        if (!this.props.show)
            return null

        const [x, y] = this.props.coords

        let locId = this.props.locations
        if ((locId instanceof Set) && locId.size == 1) {
            locId = [...locId.values()][0]
        }

        let location, title, editable, removable, removeLocation, asInitial
        if (locId instanceof Set) {
            title = `(${locId.size} lokacij)`
            editable = false
            asInitial = false
            removable = locations.checkRemoveLocations(locId)
            removeLocation = () => locId.values().forEach(this.props.onRemoveLocation)
        }
        else {
            location = locations[locId]
            title = location.title
            editable = true
            asInitial = !locations.isSpecial(locId) && locations.startLocation != locId
            removable = locations.checkRemoveLocation(locId) === true
            removeLocation = () => this.props.onRemoveLocation(locId)
        }

        return <div style={{position: "fixed", top: 0, left: 0, width: "100%", height: "100%"}}
                    onClick={this.props.onHide}
                    onContextMenu={e => {
                        e.preventDefault();
                        this.props.onHide()
                    }}>
            <Popover id="node-context-menu" placement="right" positionLeft={x} positionTop={y}>
                <strong>{title}</strong>
                <ul className="dropdown-menu open" style={{display: "block"}}>
                    <MenuItem disabled={!editable}
                              onClick={() => this.props.onEditLocation(locId)}>
                        Spremeni
                    </MenuItem>
                    <MenuItem disabled={!asInitial}
                              onClick={() => this.props.onAsInitial(location)}>
                        Nastavi kot začetno
                    </MenuItem>
                    <MenuItem disabled={!removable}
                              onClick={removeLocation}>
                        Pobriši
                    </MenuItem>
                </ul>
            </Popover>
        </div>
    }
}

class SelectionRect extends React.Component {
    render() {
        if (!this.props.coords) return null
        const [x0, y0, x1, y1] = this.props.coords
        return <polygon fill="#00ffff" fillOpacity={0.2} stroke="#0000bb" strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round"
                        points={`${x0}, ${y0} ${x1}, ${y0} ${x1}, ${y1} ${x0}, ${y1}`}/>
    }
}

export default class GameMap extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            newLine: null,
            selectionRect: null,
            selectedLocations: new Set(),
            contextMenuLoc: null,
            contextMenuCoords: [0, 0]
        }
        this.currentlyHovered = null
    }

    setHovered = (node, dir) => {
        this.currentlyHovered = node
        this.hoveredDirection = dir
    }

    moveLocationBy = (locId, xDiff, yDiff) => {
        const moveLoc = (loc) => {
            const location = locations[loc]
            location.x += xDiff
            location.y += yDiff
        }
        if (this.state.selectedLocations.size) {
            this.state.selectedLocations.forEach(moveLoc)
        }
        else {
            moveLoc(locId)
        }
        this.forceUpdate()
    }

    startNewLine = (node, dir, e) => {
        let {x, y, dx, dy} = CONN_COORDS[dir]
        const loc = locations[node.props.locId]
        x += loc.x
        y += loc.y
        this.setState({
            newLine: {
                node, dir, x, y, dx, dy, x0: e.clientX, y0: e.clientY,
                mx: e.clientX - this.offsetX, my: e.clientY - this.offsetY
            }
        })
        document.addEventListener('mousemove', this.dirMouseMove);
        document.addEventListener('mouseup', this.dirMouseUp);
        e.stopPropagation()
    }

    mouseDown = e => {
        if (e.button != 0)
            return
        const x = e.clientX - this.offsetX
        const y = e.clientY - this.offsetY
        this.setState({selectionRect: [x, y, x, y]})
        document.addEventListener('mousemove', this.selMouseMove)
        document.addEventListener('mouseup', this.selMouseUp)
    }

    selMouseMove = e => {
        const [x0, y0] = this.state.selectionRect
        this.setState({selectionRect: [x0, y0, e.clientX - this.offsetX, e.clientY - this.offsetY]})
    }

    selMouseUp = e => {
        let [x0, y0, x1, y1] = this.state.selectionRect
        if (x0 > x1) { const t = x0; x0 = x1; x1 = t }
        if (y0 > y1) { const t = y0; y0 = y1; y1 = t }
        const { selectedLocations } = this.state
        if (!e.shiftKey) {
            selectedLocations.clear()
        }
        const selection = locations.values()
            .filter(loc => x0 < loc.x + 105 && x1 > loc.x && y0 < loc.y + 105 && y1 > loc.y)
            .forEach(loc => selectedLocations.add(loc.locId))
        this.setState({selectedLocations, selectionRect: null})
        document.removeEventListener('mousemove', this.selMouseMove)
        document.removeEventListener('mouseup', this.selMouseUp)
    }

    selectLocation = (locId, shiftKey) => {
        const {selectedLocations} = this.state
        const locSelected = selectedLocations.has(locId)
        if (!shiftKey) {
            selectedLocations.clear()
        }
        if (locId) {
            if (locSelected)
                selectedLocations.delete(locId)
            else {
                selectedLocations.add(locId)
            }
        }
        this.setState({selectedLocations})
    }

    dirMouseUp = (e) => {
        const {node, dir, x0, y0} = this.state.newLine
        const opposite = {n: 's', ne: 'sw', nw: 'se', e: 'w', w: 'e', s: 'n', se: 'nw', sw: 'ne'}

        const srcLoc = locations[node.props.locId]
        undoStack.push([null, null])
        if ((x0 - e.clientX) ** 2 + (y0 - e.clientY) ** 2 > 100) {
            const dest = this.currentlyHovered
            const destLoc = dest && locations[dest.props.locId] || this.newLocation(e)
            srcLoc.setConnection(dir, destLoc.locId)
            if (srcLoc != destLoc) {
                destLoc.setConnection(this.hoveredDirection || opposite[dir], srcLoc.locId)
            }
        }
        else {
            srcLoc.removeConnection(dir)
        }

        this.setState({newLine: null})
        document.removeEventListener('mousemove', this.dirMouseMove)
        document.removeEventListener('mouseup', this.dirMouseUp)
        e.stopPropagation()
        storeLocally()
    }

    dirMouseMove = (e) => {
        const newLine = this.state.newLine
        newLine.mx = e.clientX - this.offsetX
        newLine.my = e.clientY - this.offsetY
        this.setState({newLine})
    }

    newLocation = (e) => {
        undoStack.push([null, null])
        const newLoc = locations.addLocation()
        newLoc.x = e.clientX - this.offsetX - 56
        newLoc.y = e.clientY - this.offsetY - 56
        storeLocally()
        this.props.onEditLocation(newLoc.locId, true)
        return newLoc
    }

    shouldComponentUpdate = (nextProps, nextState) => true

    removeLocation = locId => {
        undoStack.push([null, null])
        const { selectedLocations } = this.state
        selectedLocations.delete(locId)
        locations.removeLocation(locId)
        this.setState({selectedLocations})
        storeLocally()
    }

    handleKeyDown = e => {
        const runStack = (fromStack, toStack) => {
            if (!fromStack.length)
                return false
            toStack.push([null, null])
            while (fromStack.length) {
                const [action, opposite] = fromStack.pop()
                if (!action)
                    return true
                toStack.push([opposite, action])
                action()
            }
        }

        if ((e.keyCode == 8) || (e.keyCode == 46)) {
            const { selectedLocations } = this.state
            if (selectedLocations.size // prevent putting this onto undo stack
                && locations.checkRemoveLocations(selectedLocations)) {
                undoStack.push([null, null])
                selectedLocations.forEach(locations.removeLocation)
                selectedLocations.clear()
                this.setState({selectedLocations})
                storeLocally()
            }
            e.stopPropagation()
        }
        if (((e.charCode || e.keyCode) == 90) && (e.ctrlKey || e.metaKey)) {
            if (e.shiftKey ? runStack(redoStack, undoStack) : runStack(undoStack, redoStack)) {
                this.forceUpdate()
                storeLocally()
            }
            e.stopPropagation()
        }
    }

    get offsetX() {
        return document.getElementById("gamemap").getBoundingClientRect().x
    }

    get offsetY() {
        return document.getElementById("gamemap").getBoundingClientRect().y
    }

    render() {
        const xs = locations.values().map(loc => loc.x)
        const ys = locations.values().map(loc => loc.y)
        const minx = 250 // Math.min(...xs)
        const miny = 250 // Math.min(...ys)
        const maxx = Math.max(...xs)
        const maxy = Math.max(...ys)
        const width = Math.max(window.innerWidth, maxx - minx + 500)
        const height = Math.max(window.innerHeight, maxy - miny + 500)

        return <div onMouseDown={this.mouseDown} onKeyDown={this.handleKeyDown} tabIndex={0}
                    style={{outline: "none"}}>
            <NodeContextMenu
                show={this.state.contextMenuLoc}
                coords={this.state.contextMenuCoords}
                locations = {this.state.selectedLocations.size ? this.state.selectedLocations : this.state.contextMenuLoc}
                onHide={() => this.setState({contextMenuLoc: null})}
                onEditLocation={locId => { this.setState({contextMenuLoc: null}); this.props.onEditLocation(locId) }}
                onRemoveLocation={locId => { this.setState({contextMenuLoc: null}); this.removeLocation(locId) }}
                onAsInitial={this.props.onAsInitial}
            />
            <svg width={width} height={height}
                 id="gamemap" onDoubleClick={e => {
                this.newLocation(e)
                e.preventDefault()
                e.stopPropagation()
            }}>
                <defs>
                    <filter id="shadow">
                        <feDropShadow dx="2" dy="2" stdDeviation="2"/>
                    </filter>
                </defs>
                <g transform={`translate(${250 - minx} ${250 - miny})`}>
                    <Connections/>
                    <ImplicitConnections/>
                    <Nodes selection={this.state.selectedLocations}
                           onNewLine={this.startNewLine}
                           onHover={this.setHovered}
                           onMove={this.moveLocationBy}
                           onEditLocation={this.props.onEditLocation}
                           onSelectLocation={this.selectLocation}
                           onContextMenu={(locId, x, y) => this.setState({contextMenuLoc: locId, contextMenuCoords: [x, y]})}
                    />
                    <TempConnection line={this.state.newLine}/>
                </g>
                <SelectionRect coords={this.state.selectionRect}/>
            </svg>
        </div>
    }
}