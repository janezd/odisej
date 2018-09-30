import '../assets/odyssey.css'

import React from 'react'
import { render } from 'react-dom'
import Game from './game'

const container = document.getElementById('react-container')
const game = null
render(<Game gameData={game}/>, container)
