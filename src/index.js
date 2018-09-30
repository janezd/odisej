import '../assets/odyssey.css'

import React from 'react'
import { render } from 'react-dom'
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
            case 'create':
                return <Creator switchToPlay={this.switchToPlay}/>
            case 'play':
                return <Game gameData={localStorage.odisej}
                             switchToCreate={this.switchToCreate}
                             debug={this.state.debug}/>
        }
    }
}

const container = document.getElementById('react-container')
restoreLocally()
render(<App />, container)
