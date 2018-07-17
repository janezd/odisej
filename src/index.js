import React from 'react'
import { render } from 'react-dom'
import { Navbar, Nav, Button, ButtonToolbar, FormControl, ControlLabel, Label, Modal } from 'react-bootstrap'

import { restoreLocally } from './quill'
import Game from './game'
import Creator from './creator'


class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: 'create'
        }
    }

    switchToCreate = () => this.setState({mode: 'create'})
    switchToPlay = (debug) => this.setState({mode: 'play', debug})
    render() {
        switch (this.state.mode) {
            case 'create': return <Creator switchToPlay={this.switchToPlay}/>
            case 'play': return <Game switchToCreate={this.switchToCreate} debug={this.state.debug}/>
        }
    }
}

restoreLocally()
render(<App/>, document.getElementById('react-container'))
