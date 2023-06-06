export default class SheetSettingForm extends FormApplication {

    constructor(...args) {
        super(...args);
        this.dollInventory = game.settings.get('tidy-doll-inventory', 'defaultSheetConfig');
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form', 'doll-inventory-sheet-config'],
            popOut: true,
            template: 'modules/tidy-doll-inventory/templates/default-sheet-config.hbs',
            id: 'my-form-application',
            title: 'My FormApplication',
        });
    }
    getData() {
        return {
            isGM: game.user.isGM,
            isActor: false,
            dollInventory: this.dollInventory
        };
    }
    activateListeners(html) {
        super.activateListeners(html);
        let backgroundImage = html.find("img.img-edit")
        backgroundImage.click(this.editBackgroundImage.bind(this));
        html.find(".sheet-config-tab [data-attr]").change(event => this.changeLocationDisplay(event));


        html.find("[data-color]").change(this.changeColor.bind(this));
        let configInputs = html.find("input[data-sheet-config]");
        for (let inp of configInputs) {
            inp.addEventListener("change", (ev) => {
                let loc = inp.dataset.sheetConfig;
                this.dollInventory.location[loc].label = ev.currentTarget.value;
                this._updateObject();
            })

        }


    }
    _updateObject() {
        game.settings.set('tidy-doll-inventory', 'defaultSheetConfig', this.dollInventory);
    }
    async changeLocationDisplay(ev) {
        let attr = ev.currentTarget.dataset.attr;
        let val = ev.currentTarget.checked;
        foundry.utils.setProperty(this, attr, val);
        this._updateObject()



    }
    async changeColor(ev) {

        let attr = ev.currentTarget.dataset.color;
        let value = ev.currentTarget.value;

        foundry.utils.setProperty(this, attr, value);

        this._updateObject();
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
                this._updateObject();

            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        return fp.browse();
    }
    async changeLocationDisplay(ev) {
        let attr = ev.currentTarget.dataset.attr;
        let val = ev.currentTarget.checked;
        foundry.utils.setProperty(this, attr, val);
        this._updateObject()



    }
}