import React from "react"

export default class Game extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            currentLocation: 0
        }
        this.gameData = props.data
        console.log(this.gameData)
    }

    render() {
        return `this.state.currentLocation`
    }
}
