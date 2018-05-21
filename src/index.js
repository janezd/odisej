import React from 'react'
import { render } from 'react-dom'
import { Navbar, Nav, Button, ButtonToolbar } from 'react-bootstrap'

import Creator from './creator'
import Game from './game'
import GameMap from './map'


class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: 'create'
        }
    }

    switchToCreate() {
        this.setState({mode: 'create'})
    }

    switchToTry() {
        if (this.state.mode == 'create') {
            this.gameData = this.subpage.packData()
            this.setState({mode: 'game'})
        }
    }

    switchToProjects() {
        this.setState({mode: 'projects'})
    }

    setPage(page) {
        this.subpage = page
    }

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
                            <Button active={this.state.mode == 'projects'}
                                    onClick={this.switchToProjects.bind(this)}>
                                Moji projekti
                            </Button>
                        </ButtonToolbar>
                    </Navbar.Form>
                </Navbar>
                { (this.state.mode == 'create')
                    ? <Creator
                        ref={this.setPage.bind(this)}/>
                    : (this.state.mode == 'game')
                    ? <Game
                        data={this.gameData}
                        ref={this.setPage.bind(this)}/>
                    : <GameMap
                        data={this.gameData}
                        ref={this.setPage.bind(this)}/>
                }
            </div>
        )
    }
}


render(<App/>, document.getElementById('react-container'))
