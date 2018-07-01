import React from 'react'
import { render } from 'react-dom'
import { Navbar, Nav, Button, ButtonToolbar, FormControl, ControlLabel, Label } from 'react-bootstrap'

import { restoreLocally, resetData } from './quill'
import Game from './game'
import GameMap from './map'


class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: 'create'
        }
    }

    switchToCreate = () => this.setState({mode: 'create'})
    switchToTry = () => this.setState({mode: 'game'})
    setPage = page => this.subpage = page

    saveGame = () => {
        const blob = new Blob([localStorage.odisej], { type: 'text/plain' })
        const anchor = document.createElement('a');
        anchor.download = "odisej.json";
        anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
        anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':')
        anchor.click()
    }

    loadGame = files => {
        const reader = new FileReader()
        reader.onload = json => {
            restoreLocally(json.target.result)
            this.setState(this.state)
        }
        reader.readAsText(files[0])
    }

    showGameState = () => this.subpage.showGameState()

    resetData = () => { resetData(); this.setState(this.state) }

    render() {
        return (
            <div>
                <Navbar>
                    <Navbar.Header>
                        <Navbar.Brand>
                            Odisej
                        </Navbar.Brand>
                    </Navbar.Header>
                    <Navbar.Form pullRight>
                        <ButtonToolbar>
                            <Button active={this.state.mode == 'create'}
                                    onClick={this.switchToCreate.bind(this)}>
                                Ustvari
                            </Button>
                            <Button active={this.state.mode == 'game'}
                                    onClick={this.switchToTry.bind(this)}>
                                Preskusi
                            </Button>
                            <Label onClick={this.saveGame}>Shrani</Label>
                            <FormControl id="gameUpload"
                                         type="file"
                                         accept=".json"
                                         onChange={e => this.loadGame(e.target.files)}
                                         style={{display: "none"}}/>
                            <ControlLabel htmlFor="gameUpload">
                                <Label>Naloži</Label>
                            </ControlLabel>
                            { this.state.mode == 'game'
                              ? <Button onClick={this.showGameState}>Stanje igre</Button>
                              :  <Button onClick={this.resetData}>Pobriši vse</Button> }
                        </ButtonToolbar>
                    </Navbar.Form>
                </Navbar>
                { (this.state.mode == 'create')
                    ? <GameMap ref={this.setPage}/>
                    : <Game ref={this.setPage}/>
                }
            </div>
        )
    }
}


render(<App/>, document.getElementById('react-container'))
