import { Tidy5eSheet } from '../../../tidy5e-sheet/scripts/tidy5e-sheet.js'
import { dollConfig } from '../config.js';

export default class DollInventorySheet extends Tidy5eSheet {
    constructor(...args) {
        super(...args);
        this.initInventory();
    }
    get template() {
        if (!game.user.isGM && this.actor.limited && !game.settings.get('tidy5e-sheet', "expandedSheetEnabled"))
            return "modules/tidy5e-sheet/templates/actors/tidy5e-sheet-ltd.html";
        return "modules/tidy-doll-inventory/templates/tidy-doll-sheet.html";
    }


    static get defaultOptions() {

        return mergeObject(super.defaultOptions, {
            classes: ["tidy5e", "sheet", "actor", "character", "doll-inventory-sheet"],
            dragDrop: [
                { dragSelector: ".item-list .item", dropSelector: ".doll-location" }
            ]

        });
    }


    async initInventory() {
        let config = await this.actor.getFlag("tidy-doll-inventory", "sheetConfig")
        if (!config) {
            this.dollInventory = {
                displayInventory: false,
                location: dollConfig.inventory,
                background: this.actor.img,
                primaryColor: "#FFFFFF",
                secondaryColor: "#888888"
            }
        } else {
            this.dollInventory = config
        }


    }

    async getData(options) {
        const context = await super.getData(options);
        context.dollInventory = this.dollInventory;
        context.dollInventory.bags = this.initDollInventoryBags()

        return context
    }
    activateListeners(html) {
        super.activateListeners(html);

        let backgroundImage = html.find("img.img-edit")
        backgroundImage.click(this.editBackgroundImage.bind(this));

        html.find("[data-color]").change(this.changeColor.bind(this));
        html.find("div.inventory-toggle").click(this.displayFullInventory.bind(this))
        this.colorTabs();
        html.find("nav.tabs a.item").click(this.colorTabs.bind(this))
        html.find(".doll-location .item-control a").click(this._onClickDollControl.bind(this))


    }

    async initDollInventoryBags() {
        let bags = this.actor.items.filter(it => it.type == "backpack");
        console.log('BAGS___________', bags);
        return bags;
    }
    async _onDrop(event) {

        const data = TextEditor.getDragEventData(event);

        if (event.currentTarget.classList.contains("doll-location")) {
            this._onDropDollLocation(event, data)
        }

        super._onDrop(event);



    }

    async _onDropDollLocation(event, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let availableLocations = await dropItem.getFlag("tidy-doll-inventory", "inventoryLocations")
        let locationID = event.currentTarget.dataset.location;
        if (!availableLocations) {
            ui.notifications.warn("This item hasn't been configure for the tidy doll inventory yet");
            dropItem.sheet.render(true);

        }
        if (availableLocations[locationID].available) {
            this.dollInventory.location[locationID].item = foundry.utils.deepClone(dropItem);
            await dropItem.update({
                "system.equipped": true
            })
            await this.render(true);
        } else {
            return ui.notifications.warn("This item can't be set in this inventory location")
        }

    }

    async editBackgroundImage(ev) {
        ev.preventDefault();

        const attr = ev.currentTarget.dataset.sheetAttr;
        const current = foundry.utils.getProperty(this, attr);
        const fp = new FilePicker({
            type: "image",
            current: current,
            callback: async path => {
                ev.currentTarget.src = path;
                foundry.utils.setProperty(this, attr, path);
                this.persistConfig();

            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        return fp.browse();
    }

    async changeColor(ev) {
        let attr = ev.currentTarget.dataset.color;
        let value = ev.currentTarget.value;

        foundry.utils.setProperty(this, attr, value);

        this.persistConfig();
    }

    async persistConfig() {
        await this.actor.setFlag("tidy-doll-inventory", "sheetConfig", this.dollInventory);
        this.render(true)
    }
    async displayFullInventory(ev) {

        let inventoryElement = this.form.querySelector(".full-inventory");
        inventoryElement.classList.toggle("display");
        this.dollInventory.displayInventory = inventoryElement.classList.contains("display");
        await this.persistConfig()
    }

    colorTabs(ev) {
        let tabs = this.form.querySelectorAll("nav.tabs a.item")

        if (!ev) {
            for (let tab of tabs) {
                if (tab.classList.contains('active')) {
                    tab.style.backgroundColor = this.dollInventory.primaryColor;
                } else {
                    tab.style.backgroundColor = this.dollInventory.secondaryColor;

                }
            }
            this.form.querySelector(".left-pane").style.borderColor = this.dollInventory.primaryColor
            this.form.querySelector(".center-pane").style.borderColor = this.dollInventory.primaryColor
        }
        if (ev) {
            for (let tab of tabs) {
                tab.style.backgroundColor = this.dollInventory.secondaryColor;
            }
            ev.currentTarget.style.backgroundColor = this.dollInventory.primaryColor;
        }

    }
    async _onClickDollControl(ev) {
        let action = ev.currentTarget.dataset.action;
        let location = ev.currentTarget.closest('.doll-location').dataset.location;
        let itemId = ev.currentTarget.closest('.item-control').dataset.item;
        let item = await this.actor.items.get(itemId)
        switch (action) {
            case "edit":
                item.sheet.render(true)
                break;

            case "use":
                item.use();

                break;

            case "clear":
                this.clearInventoryLocation(location)
                break;

        }
    }
    async clearInventoryLocation(loc) {
        await this.dollInventory.location[loc].item.update({
            "system.equipped": false
        })
        this.dollInventory.location[loc].item = {};
        this.persistConfig();
    }
}



