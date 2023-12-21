async function dodgeRequest() {
    await fetch(
        '/lol-login/v1/session/invoke?destination=lcdsServiceProxy&method=call&args=["","teambuilder-draft","quitV2",""]',
        {
            body: '["","teambuilder-draft","quitV2",""]',
            method: "POST",
        }
    );
}


//UTILS

const version = "1.2.0"
let riotclient_auth, riotclient_port;
let regex_rc_auth = /^--riotclient-auth-token=(.+)$/
let regex_rc_port = /^--riotclient-app-port=([0-9]+)$/
let phase; // automatically updated to current gameflow phase
let debug_sub = true // to display debug messages
let routines = [] // array of functions that will be called routinely
let mutationCallbacks = [] // array of functions that will be called in mutation observer
let pvp_net_id; // automatically updated to your pvp.net id
let summoner_id; // automatically updated to your summonerId
let summoner_region; // player current region
function routineAddCallback(callback, target) {
    routines.push({ callback: callback, targets: target });
}

async function subscribe_endpoint(endpoint, callback) {
	const uri = document.querySelector('link[rel="riot:plugins:websocket"]').href
	const ws = new WebSocket(uri, 'wamp')

	ws.onopen = () => ws.send(JSON.stringify([5, 'OnJsonApiEvent' + endpoint.replace(/\//g, '_')]))
	ws.onmessage = callback
}

let updatePhaseCallback = async message => { phase = JSON.parse(message["data"])[2]["data"]; }

async function fetch_riotclient_credentials() {
	await fetch("/riotclient/command-line-args", {
		"method": "GET",
	}).then(response => response.json()).then(data => {
		data.forEach(elem => {
			if (regex_rc_auth.exec(elem))
				riotclient_auth = regex_rc_auth.exec(elem)[1];
			else if (regex_rc_port.exec(elem))
				riotclient_port = regex_rc_port.exec(elem)[1];
		});
	})

}

function generateDodgeAndExitButton(siblingDiv) {
	const div = document.createElement("div");
	const parentDiv = document.createElement("div")

	parentDiv.setAttribute("class", "dodge-button-container")
	parentDiv.setAttribute("style", "position: absolute;right: 10px;bottom: 57px;width: 125px;display: flex;align-items: flex-end;")
	div.setAttribute("class", "quit-button ember-view");
	div.addEventListener("click", dodgeRequest);
	div.setAttribute("id", "dodgeButton");

	const button = document.createElement("lol-uikit-flat-button");
	button.innerHTML = "Dodge";

	div.appendChild(button);

	parentDiv.appendChild(div);
	console.log(parentDiv)
	siblingDiv.parentNode.insertBefore(parentDiv, siblingDiv)
}

let addDodgeAndExitButtonObserver = (mutations) => {
    if (
        phase == "ChampSelect" &&
        document.querySelector(".bottom-right-buttons") &&
        !document.querySelector(".dodge-button-container")
    ) {
        generateDodgeAndExitButton(
            document.querySelector(".bottom-right-buttons")
        );
    }
};

window.addEventListener('load', () => {
	fetch_riotclient_credentials()
	subscribe_endpoint("/lol-gameflow/v1/gameflow-phase", updatePhaseCallback)
	window.setInterval(() => {
		routines.forEach(routine => {
			routine.callback()
		})
	}, 1300)

	const observer = new MutationObserver((mutationsList) => {
		for (let mutation of mutationsList) {
			for (let addedNode of mutation.addedNodes) {
				if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList) {
					for (let addedNodeClass of addedNode.classList) {
						for (let obj of mutationCallbacks) {
							if (obj.targets.indexOf(addedNodeClass) != -1 || obj.targets.indexOf("*") != -1) {
								obj.callback(addedNode)
							}
						}
					}
				}
			}
		}
	});
	observer.observe(document, { attributes: false, childList: true, subtree: true });
})

window.addEventListener('load', () => {
	routineAddCallback(addDodgeAndExitButtonObserver, ["bottom-right-buttons"])
})

//FINE UTILS

const dodgeButtonCB = (message) => {
    if (message.data === "ChampSelect") {
        setTimeout(() => {
            const buttonRightButtons = document.querySelector(
                ".bottom-right-buttons"
            );
            if (
                buttonRightButtons &&
                buttonRightButtons.previousElementSibling.className !==
                    "dodge-button-container"
            ) {
                createButton();
            }
        }, 4000);
    }
};

function createButton() {
    const siblingDiv = document.querySelector(".bottom-right-buttons");

    const div = document.createElement("div");
    const parentDiv = document.createElement("div");

    parentDiv.setAttribute("class", "dodge-button-container");
    parentDiv.setAttribute(
        "style",
        "position: absolute;right: 10px;bottom: 57px;display: flex;align-items: flex-end;"
    );

    div.setAttribute("class", "quit-button ember-view");
    div.onclick = dodgeRequest;
    div.setAttribute("id", "dodgeButton");

    const button = document.createElement("lol-uikit-flat-button");
    button.innerHTML = "Dodge";

    div.appendChild(button);

    parentDiv.appendChild(div);
    siblingDiv.parentNode.insertBefore(parentDiv, siblingDiv);
}


export function init(context) {
    // Socket observing
    //context.socket.observe("/lol-gameflow/v1/gameflow-phase", dodgeButtonCB);
}

export function load() {}

function getPluginName() {
    let scriptPath = getScriptPath();
    let regex = /\/([^/]+)\/index\.js$/;
    let match = scriptPath.match(regex);
    let pluginName = match ? match[1] : null;
    return pluginName;
}

function addCss(filename) {
    const style = document.createElement("link");
    style.href = filename;
    style.type = "text/css";
    style.rel = "stylesheet";
    document.body.append(style);
}
