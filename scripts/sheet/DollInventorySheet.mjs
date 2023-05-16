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
                { dragSelector: ".item-list .item", dropSelector: ".doll-location" },
                { dragSelector: ".item-list .item", dropSelector: null },
                { dragSelector: ".item-list .item", dropSelector: "li.bagSlot" }

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
        context.dollInventory.bags = await this.initDollInventoryBags()

        return context
    }
    async activateListeners(html) {
        super.activateListeners(html);
        if (!await this.actor.getFlag("tidy-doll-inventory", "itemsInit")) {
            html.prepend(`
            <div class="waiting">
            <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            `)
             this.initItemsFlags(html);
        }
        let backgroundImage = html.find("img.img-edit")
        backgroundImage.click(this.editBackgroundImage.bind(this));

        html.find("[data-color]").change(this.changeColor.bind(this));
        html.find("div.inventory-toggle").click(this.displayFullInventory.bind(this))
        this.colorTabs();
        html.find("nav.tabs a.item").click(this.colorTabs.bind(this))
        html.find(".doll-switch").click(this.switchStow.bind(this))


    }
    async initItemsFlags(html) {
        await this.actor.setFlag("tidy-doll-inventory", "itemsInit", true)
        this.actor.items.forEach(async it => {

            let locations = dollConfig.inventory;
            for (let loc in locations) {
                //allowing all locations
                locations[loc].available = true;
            }
            await it.setFlag("tidy-doll-inventory", "inventoryLocations",
                locations
            );

        });
        html.find('div.waiting').remove()

    }
    async initDollInventoryBags() {
        let dollBags = [];
        let bags = this.actor.items.filter((it) => it.type == "backpack");
        for (let bag of bags) {
            if (!bag.flags["tidy-doll-inventory"]?.bagSlots) {
                let flag = {
                    "weightRatio": 1,
                    "computedWeight": 0,
                    "innerItems": new Array(bag.system.capacity.value),
                    "available": false
                }
                await bag.setFlag("tidy-doll-inventory", "bagSlots", flag)
            }
            let flag = await bag.getFlag("tidy-doll-inventory", "bagSlots");
            flag.innerItems = flag.innerItems.slice(0, parseInt(bag.system.capacity.value))

            if (bag.flags["tidy-doll-inventory"]?.bagSlots?.available) {
                dollBags.push(bag)
            }
        }
        return dollBags;
    }
    async _onDrop(event) {

        const data = TextEditor.getDragEventData(event);

        if (event.currentTarget.classList.contains("doll-location")) {
           return this._onDropDollLocation(event, data)
        }
        else if (event.currentTarget.classList.contains("bagSlot")) {
           return this._onDropBagSlot(event, data)
        } else {
            if (this.dragedItem) {
                                       

                this.clearInventoryLocation(this.dragedItem.flags["tidy-doll-inventory"].equippedSlot);
 this.dragedItem=null;
            }
            super._onDrop(event);
        }

    }
    async _onDragStart(event) {
        console.log(event.currentTarget)
        if (event.currentTarget.classList.contains("location-item")) {
            let itemId = event.currentTarget.dataset.itemId;
            let item = await this.actor.items.get(itemId);
            this.dragedItem = item;
        }
        console.log(this)
        super._onDragStart(event)
    }
    async _onDropBagSlot(ev, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let targetBag = await this.actor.items.get(ev.currentTarget.closest("li.item.bag").dataset.itemId)
        let index = ev.currentTarget.dataset.slotIndex;

        let flag = await targetBag.getFlag("tidy-doll-inventory", "bagSlots");
        let it = foundry.utils.deepClone(dropItem);
        it.itemId = dropItem.id;

        flag.innerItems[index] = it;

        await targetBag.setFlag("tidy-doll-inventory", "bagSlots", flag);
        this.persistConfig()


    }
    async _onDropDollLocation(event, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let availableLocations = await dropItem.getFlag("tidy-doll-inventory", "inventoryLocations")
        let locationID = event.currentTarget.dataset.location;

       


        if (!dollConfig.dropableTypes.includes(dropItem.type)) {
            if (dropItem.type == "backpack" && (locationID == "bag" || locationID == "coinPouch")) {
                return this.equipSlot(dropItem, locationID)
            }
            else {
                return ui.notifications.warn("this type of item can't be dropped in inventory doll")
            }
        }

        if (!availableLocations) {
            ui.notifications.warn("This item hasn't been configure for the tidy doll inventory yet");
            dropItem.sheet.render(true);
        }

        if (availableLocations[locationID].available) {
            console.log(dropItem)
            if (dropItem.system.properties?.two && (locationID === "mainHan" || locationID === "offHand")) {

                this.equipSlot(dropItem, "mainHand");
                this.equipSlot(dropItem, "offHand")
            }
            this.equipSlot(dropItem, locationID)

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
        this.actor.setFlag("tidy-doll-inventory", "sheetConfig", this.dollInventory);

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

    async equipSlot(item, slot) {

        this.dollInventory.location[slot].item = foundry.utils.deepClone(item);
        this.dollInventory.location[slot].item.itemId = item._id;


        await item.update({
            "system.equipped": true,
            "flags.tidy-doll-inventory.equippedSlot": slot
        })
        this.persistConfig();

    }

    async clearInventoryLocation(loc) {

        if (loc && this.dollInventory.location[loc].item) {
            let item =await this.actor.items.get(this.dollInventory.location[loc].item.itemId)
            await item.update({
                "system.equipped": false,
                "flags.tidy-sheet-inventory.equippedSlot":null
                
            });
        }
        if ((loc == "mainHand" || loc == "offHand") && this.dollInventory.location[loc].item?.system.properties?.two) {
            this.dollInventory.location.mainHand.item = null;
            this.dollInventory.location.offHand.item = null;
        }
        this.dollInventory.location[loc].item = null;
        await this.persistConfig();


    }
    async switchStow(ev) {
        let hand = ev.currentTarget.dataset.hand;
        let item, targetLoc, sourceLoc;
        switch (hand) {
            case "main":
                if (this.dollInventory.location.mainHand.item?.itemId && !this.dollInventory.location.stowMain.item?.itemId) {
                    item = await this.actor.items.get(this.dollInventory.location.mainHand.item.itemId);
                    targetLoc = "stowMain";
                    sourceLoc = "mainHand"
                }
                if (this.dollInventory.location.stowMain.item?.itemId && !this.dollInventory.location.mainHand.item?.itemId) {
                    item = await this.actor.items.get(this.dollInventory.location.stowMain.item.itemId);
                    targetLoc = "mainHand";
                    sourceLoc = "stowMain"
                }
                break;

            case "off":
                if (this.dollInventory.location.offHand.item?.itemId && !this.dollInventory.location.stowOff.item?.itemId) {
                    item = await this.actor.items.get(this.dollInventory.location.offHand.item.itemId);
                    targetLoc = "stowOff";
                    sourceLoc = "offHand"
                }
                if (this.dollInventory.location.stowOff.item?.itemId && !this.dollInventory.location.offHand.item?.itemId) {
                    item = await this.actor.items.get(this.dollInventory.location.stowOff.item.itemId);
                    targetLoc = "offHand";
                    sourceLoc = "stowOff"
                }
                break;


        };
        this.clearInventoryLocation(sourceLoc);
        this.equipSlot(item, targetLoc)

    }
}



