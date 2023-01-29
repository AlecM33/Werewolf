const template =
    `<div id="modal-background" class="modal-background"></div>
    <div tabindex="-1" id="role-modal" class="modal">
        <form id="role-form">
            <div>
                <label for="role-name">Role Name</label>
                <input id="role-name" type="text" autocomplete="off" placeholder="Name your role..." required/>
            </div>
            <div>
                <label for="role-alignment">Role Alignment</label>
                <select id="role-alignment" required>
                    <option value="good">good</option>
                    <option value="evil">evil</option>
                </select>
            </div>
            <div>
                <label for="role-description">Description</label>
                <textarea id="role-description" rows="4" cols="1" placeholder="Describe your role..." required></textarea>
            </div>
            <div class="modal-button-container">
                <button id="close-modal-button" class="cancel app-button">Close</button>
                <input type="submit" id="create-role-button" value="Create Role"/>
            </div>
        </form>
    </div>
    <div tabindex="-1" id="upload-custom-roles-modal" class="modal">
        <h3>Import Custom Roles</h3>
        <form id="upload-custom-roles-form">
            <input type="file" id="upload-custom-roles" name="Upload Custom Roles" accept="text/plain"/>
            <div class="modal-button-container">
                <button id="close-upload-custom-roles-modal-button" class="cancel app-button">Close</button>
                <input type="submit" id="upload-custom-roles-button" value="Upload"/>
            </div>
        </form>
    </div>
    <div tabindex="-1" id="custom-role-info-modal" class="modal">
        <h3 id="custom-role-info-modal-name"></h3>
        <label for="custom-role-info-modal-alignment">alignment:</label>
        <div id="custom-role-info-modal-alignment"></div>
        <label for="custom-role-info-modal-alignment">description:</label>
        <div id="custom-role-info-modal-description"></div>
        <div class="modal-button-container">
            <button id="close-custom-role-info-modal-button" class="cancel app-button">Close</button>
        </div>
    </div>
    <div tabindex='-1' id='deck-template-modal' class='modal'>
        <h2>Choose a pre-built game:</h2>
        <div id='deck-template-container'></div>
        <div class='modal-button-container single-button'>
            <button id='close-deck-template-modal-button' class='cancel app-button'>Close</button>
        </div>
    </div>
    <h1>Create A Game</h1>
    <div id="tracker-container">
        <div id="creation-step-tracker">
            <div id="tracker-step-1" class="creation-step creation-step-filled"></div>
            <div id="tracker-step-2" class="creation-step"></div>
            <div id="tracker-step-3" class="creation-step"></div>
            <div id="tracker-step-4" class="creation-step"></div>
            <div id="tracker-step-5" class="creation-step"></div>
        </div>
    </div>
    <div id="creation-step-container">
        <h2 id="step-title">Select your method of moderation:</h2>
        <div class="placeholder-row">
            <div class="animated-placeholder animated-placeholder-short"></div>
            <div class="animated-placeholder animated-placeholder-short animated-placeholder-invisible"></div>
        </div>
        <div class="animated-placeholder animated-placeholder-long"></div>
        <div class="animated-placeholder animated-placeholder-long"></div>
    </div>`;

export default template;
