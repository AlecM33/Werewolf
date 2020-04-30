import { addStubElement } from "../SpecHelper.js"
import { setup } from "../../static/setup.js"

describe("Home page", function() {

    beforeEach(function() {

    });

    it("should render the set of standard and custom roles", function() {

        // arrange
        let goodCards = document.createElement("div");
        goodCards.setAttribute("id", "card-select-good");

        let evilCards = document.createElement("div");
        evilCards.setAttribute("id", "card-select-evil");

        let roles = document.createElement("div");
        roles.setAttribute("id", "roles");

        let customRoles = document.createElement("div");
        customRoles.setAttribute("id", "custom-roles");

        addStubElement(goodCards);
        addStubElement(evilCards);
        addStubElement(roles);
        addStubElement(customRoles);

        // act
        setup.renderAvailableCards(false);

        //assert
        expect(document.getElementById("card-0")).toBeDefined();
    });

});
