const Compass = (props) => {
    const Direction = (dirprops) => {
        const command = props.directions[dirprops.dir]
        return command ? <g onClick={command}>{dirprops.children}</g> : null
    }

    return <svg width={200} height={200}>
        <circle className="compass-st2" cx="84.018" cy="84.333" r="81.2"/>
        <Direction dir="n">
            <circle className="compass-st8" cx="84.018" cy="25.333" r="14.544"/>
            <text transform="matrix(1 0 0 1 79.6089 30.835)" className="compass-st1 st0">S</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="84.018" y2="52.102"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="89.426,57.013 84.003,52.753 78.418,57.013 83.924,44 					"/>
                            <polygon className="compass-st3"
                                     points="88.385,55.663 84.003,45.458 84.003,52.102 					"/>
                            <polygon className="compass-st5"
                                     points="79.622,55.663 84.005,45.458 84.005,52.102 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="sw">
            <ellipse className="compass-st6" cx="42.298" cy="126.052" rx="16.873" ry="14.544"/>
            <text transform="matrix(1 0 0 1 34.2236 131.835)" className="compass-st1 st0">JZ</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="61.227" y2="107.123"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="60.875,99.827 61.699,106.673 68.66,107.61 55.564,112.919 					"/>
                            <polygon className="compass-st3"
                                     points="60.658,101.517 56.54,111.832 61.238,107.134 					"/>
                            <polygon className="compass-st5"
                                     points="66.854,107.714 56.538,111.831 61.237,107.132 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="se">
            <ellipse className="compass-st6" cx="125.737" cy="126.053" rx="16.873" ry="14.544"/>
            <text transform="matrix(1 0 0 1 117.9673 131.835)" className="compass-st1 st0">JV</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="106.808" y2="107.124"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="99.512,107.476 106.358,106.653 107.295,99.692 112.604,112.787 					"/>
                            <polygon className="compass-st3"
                                     points="101.203,107.693 111.517,111.812 106.819,107.113 					"/>
                            <polygon className="compass-st5"
                                     points="107.399,101.497 111.516,111.813 106.817,107.115 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="ne">
            <ellipse className="compass-st6" cx="125.738" cy="42.613" rx="16.873" ry="14.544"/>
            <text transform="matrix(1 0 0 1 116.2622 48.335)" className="compass-st1 st0">SV</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="106.808" y2="61.543"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="107.16,68.839 106.337,61.993 99.376,61.056 112.471,55.747 					"/>
                            <polygon className="compass-st3"
                                     points="107.378,67.149 111.497,56.834 106.798,61.533 					"/>
                            <polygon className="compass-st5"
                                     points="101.181,60.952 111.498,56.835 106.799,61.534 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="w">
            <circle className="compass-st8" cx="25.018" cy="84.333" r="14.544"/>
            <text transform="matrix(1 0 0 1 19.4155 90.335)" className="compass-st1 st0">Z</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="51.787" y2="84.333"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="56.698,78.925 52.438,84.348 56.698,89.933 43.685,84.427 					"/>
                            <polygon className="compass-st3"
                                     points="55.348,79.966 45.143,84.348 51.787,84.348 					"/>
                            <polygon className="compass-st5"
                                     points="55.348,88.729 45.143,84.346 51.787,84.346 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="s">
            <circle className="compass-st8" cx="84.019" cy="143.333" r="14.544"/>
            <text transform="matrix(1 0 0 1 81.7358 148.3345)" className="compass-st1 st0">J</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="84.018" y2="116.564"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="78.61,111.653 84.033,115.913 89.618,111.653 84.112,124.667 					"/>
                            <polygon className="compass-st3"
                                     points="79.651,113.003 84.033,123.208 84.033,116.564 					"/>
                            <polygon className="compass-st5"
                                     points="88.415,113.003 84.031,123.208 84.031,116.564 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="e">
            <circle className="compass-st8" cx="143.018" cy="84.333" r="14.544"/>
            <text transform="matrix(1 0 0 1 136.9517 90.335)" className="compass-st1 st0">V</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="116.25" y2="84.333"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="111.338,89.741 115.598,84.318 111.338,78.733 124.352,84.239 					"/>
                            <polygon className="compass-st3"
                                     points="112.688,88.7 122.894,84.318 116.25,84.318 					"/>
                            <polygon className="compass-st5"
                                     points="112.688,79.937 122.894,84.32 116.25,84.32 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <Direction dir="nw">
            <ellipse className="compass-st6" cx="42.298" cy="42.614" rx="16.872" ry="14.544"/>
            <text transform="matrix(1 0 0 1 32.5195 48.335)" className="compass-st1 st0">SZ</text>
            <g>
                <g>
                    <line className="compass-st7" x1="84.018" y1="84.333" x2="61.228" y2="61.542"/>
                    <g>
                        <g>
                            <polygon className="compass-st4"
                                     points="68.524,61.19 61.678,62.013 60.741,68.974 55.432,55.879 					"/>
                            <polygon className="compass-st3"
                                     points="66.833,60.973 56.519,56.854 61.217,61.553 					"/>
                            <polygon className="compass-st5"
                                     points="60.637,67.169 56.521,56.853 61.219,61.551 					"/>
                        </g>
                    </g>
                </g>
            </g>
        </Direction>
        <circle fill="#F4CEB1" stroke="#5D290D" strokeWidth="1.0384" strokeMiterlimit="10" cx="84.018" cy="84.333"
                r="5.047"/>
    </svg>
}

export default Compass