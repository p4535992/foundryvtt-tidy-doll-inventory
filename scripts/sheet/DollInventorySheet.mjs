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
                { dragSelector: ".item-list .item", dropSelector: "li.bagSlot" },
                { dragSelector: ".doll-location .item", dropSelector: "div.clear-slot" },



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
            this.actor.setFlag("tidy-doll-inventory", "sheetConfig", this.dollInventory)

        } else {
            this.dollInventory = config;
        }


    }

    async getData(options) {
        const context = await super.getData(options);
        await this.filterDollItems();
        context.dollInventory = this.dollInventory;
        console.log(context.dollInventory)
        context.dollInventory.bags = await this.initDollInventoryBags()

        return context
    }

    async filterDollItems() {
        let itemList = this.actor.items.filter(it => it.flags["tidy-doll-inventory"]?.equippedSlot);
        for (let loc in this.dollInventory.location) {
            console.log(loc)
            this.dollInventory.location[loc].item = await this.actor.items.find(it => it.flags['tidy-doll-inventory'].equippedSlot == loc) || null
        };

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
        if (this.dollInventory.location.mainHand.item?.system.properties?.two) {
            this.disableOffHand()
        }

        let backgroundImage = html.find("img.img-edit")
        backgroundImage.click(this.editBackgroundImage.bind(this));
        this.colorTabs();


        html.find("[data-color]").change(this.changeColor.bind(this));
        html.find("div.inventory-toggle").click(this.displayFullInventory.bind(this))
        html.find("nav.tabs a.item").click(this.colorTabs.bind(this))
        html.find(".doll-switch").click(this._onSwitchStow.bind(this));
        html.find(".bag-item-list .bagSlot .item-image i").click(this._onReadyItem.bind(this))

        let configInputs = html.find("input[data-sheet-config]");
        for (let inp of configInputs) {
            inp.addEventListener("change", (ev) => {
                let loc = inp.dataset.sheetConfig;
                this.dollInventory.location[loc].label = ev.currentTarget.value;
                this.persistConfig();
            })

        }

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
            let flag = {};
            if (!bag.flags["tidy-doll-inventory"]?.bagSlots) {
                flag = {
                    "weightRatio": 1,
                    "computedWeight": 0,
                    "innerItems": new Array(bag.system.capacity.value),
                    "available": false
                }
                await bag.setFlag("tidy-doll-inventory", "bagSlots", flag)
            }
            else {
                flag = await bag.getFlag("tidy-doll-inventory", "bagSlots");

            }
            for (let i = 0; i < bag.system.capacity.value; i++) {
                flag.innerItems[i] = flag.innerItems[i];
                if (i == bag.system.capacity.value - 1) {
                    flag.innerItems.splice(i + 1, flag.innerItems.length + 1 - bag.system.capacity.value)
                }
            }

            await bag.setFlag("tidy-doll-inventory", "bagSlots", flag)
            if (bag.flags["tidy-doll-inventory"]?.bagSlots?.available) {
                dollBags.push(bag)
            }
        }
        return dollBags;
    };

    async _onDragStart(event) {
        if (event.currentTarget.classList.contains("location-item")) {
            let itemId = event.currentTarget.dataset.itemId;
            let item = await this.actor.items.get(itemId);

            this.element.find('.clear-slot')[0].classList.add('visible');
            console.log(item)
        }
        super._onDragStart(event)
    }


    async _onDrop(event) {

        const data = TextEditor.getDragEventData(event);
        let dropItem = await Item.implementation.fromDropData(data);

        console.log(event.currentTarget?.classList);
        if (this.element.find('.clear-slot.visible')[0]) {
            this.element.find('.clear-slot')[0].classList.remove('visible');

        }


        if (event.currentTarget?.classList.contains("doll-location")) {
            return this._onDropDollLocation(event, data)
        }
        else if (event.currentTarget?.classList.contains("bagSlot")) {
            return this._onDropBagSlot(event, data)
        }
        else if (event.currentTarget?.classList.contains("clear-slot")) {
            this.clearInventoryLocation(dropItem)
        }
        else {

            super._onDrop(event);

        }


    }

    async _onDropBagSlot(ev, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let targetBag = await this.actor.items.get(ev.currentTarget.closest("li.item.bag").dataset.itemId)
        let index = ev.currentTarget.dataset.slotIndex;

        //flagging dropped item with the bag id
        await dropItem.setFlag("tidy-doll-inventory", "bagContainer",
            {
                bagId: targetBag.id,
                bagIndex: index
            })

        //flagging the bag with the dropped item
        let flag = await targetBag.getFlag("tidy-doll-inventory", "bagSlots");
        let it = foundry.utils.duplicate(dropItem);
        it.itemId = dropItem.id;

        flag.innerItems[index] = it;

        await targetBag.setFlag("tidy-doll-inventory", "bagSlots", flag);
        this.persistConfig()


    }
    async _onReadyItem(ev) {
        console.log(this.dollInventory)
        let nextEmptyReady;
    }
    async _onDropDollLocation(event, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let availableLocations = await dropItem.getFlag("tidy-doll-inventory", "inventoryLocations")
        let locationID = event.currentTarget.dataset.location;



        // equip backpack in bags
        if (!dollConfig.dropableTypes.includes(dropItem.type)) {
            if (dropItem.type == "backpack" && (locationID == "bag" || locationID == "coinPouch")) {
                return this.equipSlot(dropItem, locationID)
            }
            else {
                return ui.notifications.warn("this type of item can't be dropped in inventory doll")
            }
        }
        // if location not allowed by item's flags
        if (!availableLocations) {
            return ui.notifications.warn("This item hasn't been configure for the tidy doll inventory yet");
        }
        // if location allowed 
        if (availableLocations[locationID].available) {

            // if item is two-handed
            if (dropItem.system.properties?.two && (locationID === "mainHand" || locationID === "offHand")) {
                return this.equipBothHands(dropItem);
            }
            if (locationID == "stowMain" || locationID == "stowOff") {
                return (ui.notifications.warn("You must equip in hands before stowing"))
            }
            return this.equipSlot(dropItem, locationID)

        }
        // everything else= dropping not allowed
        else {
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
    clearActualDragedItemSlot() {
        this.dragedItem = null;

    }
    async clearBagSlot(item) {
        let bag = await this.actor.items.get(item.flags["tidy-doll-inventory"].bagContainer.bagId);
        let index = item.flags["tidy-doll-inventory"].bagContainer.bagIndex;
        let bagSlots = bag.flags["tidy-doll-inventory"].bagSlots;
        bagSlots.innerItems[index] = null;

        bag.flags["tidy-doll-inventory"].bagSlots = bagSlots;
        item.flags["tidy-doll-inventory"].bagContainer = null;

        await this.actor.updateEmbeddedDocuments("Item", [bag, item])
    }
    async equipSlot(item, slot) {
        let actualItem = this.actor.items.find(it => it.flags["tidy-doll-inventory"].equippedSlot == slot)
        if (actualItem && (actualItem.id != item.id)) {
            await this.clearInventoryLocation(actualItem)
        }
        if (item.flags["tidy-doll-inventory"].bagContainer) {
            this.clearBagSlot(item)
        }
        await item.update({
            "system.equipped": true,
            "flags.tidy-doll-inventory.equippedSlot": slot
        });


    }
    async equipBothHands(item) {

        await item.update({
            "system.equipped": true,
            "flags.tidy-doll-inventory.equippedSlot": "mainHand"
        });

    }
    async equipBothStow(item) {

        await item.update({
            "system.equipped": true,
            "flags.tidy-doll-inventory.equippedSlot": "offMain"
        })

    }
    async clearInventoryLocation(item) {
        let flag = item.flags["tidy-doll-inventory"];
        flag.equippedSlot = null;

        await item.update({
            "system.equipped": false,
            "flags.tidy-doll-inventory": flag
        })
    }
    disableOffHand() {

        let offEl = this.element.find("[data-location='offHand']")[0];
        offEl.classList.add("disabled")
        let stowOffEl = this.element.find("[data-location='stowOff']")[0];
        stowOffEl.classList.add("disabled");
        let switchOff = this.element.find("[data-hand='off']")[0];
        switchOff.classList.add("disabled");

        let mainEl = this.element.find("[data-location='mainHand']")[0];
        mainEl.classList.add("twoHands")
        let stowmainEl = this.element.find("[data-location='stowMain']")[0];
        stowmainEl.classList.add("twoHands");
        let switchmain = this.element.find("[data-hand='main']")[0];
        switchmain.classList.add("twoHands");

    }
    async _onSwitchStow(ev) {
        let loc = undefined;
        let hand = ev.currentTarget.dataset.hand;
        if (hand == "off") {
            if (this.dollInventory.location.offHand.item) {
                loc = "offHand"
            }
            if (this.dollInventory.location.stowOff.item) {
                loc = "stowOff"
            }
        }
        if (hand == "main") {
            if (this.dollInventory.location.mainHand.item) {
                loc = "mainHand"
            }
            if (this.dollInventory.location.stowMain.item) {
                loc = "stowMain"
            }
        }
        if (!loc) { return }
        let source, item;
        item = this.dollInventory.location[loc].item
        source = item.flags["tidy-doll-inventory"].equippedSlot;

        this.switchStow(item, source)

    }

    switchStow(item, source) {
        console.log(...arguments);
        let dest = "";
        switch (source) {
            case "mainHand":
                dest = "stowMain"
                break;
            case "stowMain":
                dest = "mainHand"
                break;
            case "offHand":
                dest = "stowOff";
                break;
            case "stowOff":
                dest = "offHand";
                break;

        }
        this.equipSlot(item, dest);

    }

}

