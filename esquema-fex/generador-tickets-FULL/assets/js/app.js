/* =========================================================
   TicketPro
   Generador profesional de tickets
   Funcionamiento 100% local - localStorage
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const APP_CONFIG = {
    storageKeys: {
        business: "ticketpro_business",
        settings: "ticketpro_settings",
        history: "ticketpro_history",
        nextTicket: "ticketpro_next_ticket"
    },

    defaults: {
        currency: "MXN",
        ticketSize: 80,
        taxEnabled: true,
        tax: 16,
        discount: 0
    },

    maxProducts: 100,

    currencyLocales: {
        MXN: "es-MX",
        USD: "en-US",
        EUR: "es-ES"
    }
};


/* =========================================================
   ESTADO DE LA APLICACIÓN
   ========================================================= */

const state = {
    business: {
        name: "",
        phone: "",
        whatsapp: "",
        email: "",
        web: "",
        rfc: "",
        location: "",
        address: "",
        logo: ""
    },

    settings: {
        currency: APP_CONFIG.defaults.currency,
        ticketSize: APP_CONFIG.defaults.ticketSize
    },

    sale: {
        ticketNumber: 1,
        customerName: "",
        customerPhone: "",
        paymentMethod: "",
        products: [],
        taxEnabled: APP_CONFIG.defaults.taxEnabled,
        tax: APP_CONFIG.defaults.tax,
        discount: APP_CONFIG.defaults.discount,
        note: ""
    },

    history: []
};


/* =========================================================
   REFERENCIAS DOM
   ========================================================= */

const DOM = {};

function cacheDOM() {

    DOM.navItems = document.querySelectorAll(".nav-item");
    DOM.sections = document.querySelectorAll(".section");

    DOM.pageTitle = document.getElementById("page-title");
    DOM.pageDescription = document.getElementById("page-description");

    DOM.topNewSale = document.getElementById("top-new-sale");
    DOM.startButton = document.getElementById("start-button");

    /* Inicio */
    DOM.statBusiness = document.getElementById("stat-business");
    DOM.statTicket = document.getElementById("stat-ticket");

    /* Negocio */
    DOM.businessForm = document.getElementById("business-form");
    DOM.businessName = document.getElementById("business-name");
    DOM.businessPhone = document.getElementById("business-phone");
    DOM.businessWhatsapp = document.getElementById("business-whatsapp");
    DOM.businessEmail = document.getElementById("business-email");
    DOM.businessWeb = document.getElementById("business-web");
    DOM.businessRfc = document.getElementById("business-rfc");
    DOM.businessLocation = document.getElementById("business-location");
    DOM.businessAddress = document.getElementById("business-address");
    DOM.businessLogo = document.getElementById("business-logo");
    DOM.logoPreview = document.getElementById("logo-preview");
    DOM.removeLogo = document.getElementById("remove-logo");

    /* Venta */
    DOM.currentTicket = document.getElementById("current-ticket");

    DOM.customerName = document.getElementById("customer-name");
    DOM.customerPhone = document.getElementById("customer-phone");
    DOM.paymentMethod = document.getElementById("payment-method");

    DOM.addProduct = document.getElementById("add-product");
    DOM.productsContainer = document.getElementById("products-container");

    DOM.enableTax = document.getElementById("enable-tax");
    DOM.saleTax = document.getElementById("sale-tax");
    DOM.generalDiscount = document.getElementById("general-discount");

    DOM.ticketNote = document.getElementById("ticket-note");

    DOM.clearSale = document.getElementById("clear-sale");
    DOM.saveSale = document.getElementById("save-sale");

    DOM.ticket = document.getElementById("ticket");

    DOM.downloadPng = document.getElementById("download-png");
    DOM.printTicket = document.getElementById("print-ticket");

    /* Historial */
    DOM.clearHistory = document.getElementById("clear-history");
    DOM.historyContainer = document.getElementById("history-container");

    /* Configuración */
    DOM.currency = document.getElementById("currency");
    DOM.ticketSize = document.getElementById("ticket-size");

    /* Toast */
    DOM.toast = document.getElementById("toast");
    DOM.toastMessage = document.getElementById("toast-message");

    /* Modal */
    DOM.historyModal = document.getElementById("history-modal");
    DOM.historyModalContent = document.getElementById("history-modal-content");
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

function init() {

    cacheDOM();

    loadAllData();

    loadBusinessForm();

    loadSettingsForm();

    updateBusinessPreview();

    setupNavigation();

    setupBusinessEvents();

    setupSaleEvents();

    setupHistoryEvents();

    setupSettingsEvents();

    setupModalEvents();

    updateNextTicketUI();

    renderProducts();

    updateTicket();

    renderHistory();

    updateTicketSize();

    console.log("TicketPro iniciado correctamente.");
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadAllData() {

    const business = localStorage.getItem(
        APP_CONFIG.storageKeys.business
    );

    const settings = localStorage.getItem(
        APP_CONFIG.storageKeys.settings
    );

    const history = localStorage.getItem(
        APP_CONFIG.storageKeys.history
    );

    const nextTicket = localStorage.getItem(
        APP_CONFIG.storageKeys.nextTicket
    );

    if (business) {
        try {
            state.business = {
                ...state.business,
                ...JSON.parse(business)
            };
        } catch (error) {
            console.error("Error cargando negocio:", error);
        }
    }

    if (settings) {
        try {
            state.settings = {
                ...state.settings,
                ...JSON.parse(settings)
            };
        } catch (error) {
            console.error("Error cargando configuración:", error);
        }
    }

    if (history) {
        try {
            const parsedHistory = JSON.parse(history);

            if (Array.isArray(parsedHistory)) {
                state.history = parsedHistory;
            }
        } catch (error) {
            console.error("Error cargando historial:", error);
        }
    }

    if (nextTicket) {

        const number = parseInt(nextTicket, 10);

        if (
            Number.isFinite(number) &&
            number >= 1
        ) {
            state.sale.ticketNumber = number;
        }
    }
}


function saveBusiness() {

    localStorage.setItem(
        APP_CONFIG.storageKeys.business,
        JSON.stringify(state.business)
    );
}


function saveSettings() {

    localStorage.setItem(
        APP_CONFIG.storageKeys.settings,
        JSON.stringify(state.settings)
    );
}


function saveHistory() {

    localStorage.setItem(
        APP_CONFIG.storageKeys.history,
        JSON.stringify(state.history)
    );
}


function saveNextTicket() {

    localStorage.setItem(
        APP_CONFIG.storageKeys.nextTicket,
        String(state.sale.ticketNumber)
    );
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function setupNavigation() {

    DOM.navItems.forEach(button => {

        button.addEventListener("click", () => {

            const section = button.dataset.section;

            navigateTo(section);
        });
    });


    if (DOM.topNewSale) {

        DOM.topNewSale.addEventListener("click", () => {

            navigateTo("venta");

        });
    }


    if (DOM.startButton) {

        DOM.startButton.addEventListener("click", () => {

            navigateTo("venta");

        });
    }
}


function navigateTo(sectionName) {

    DOM.navItems.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });


    DOM.sections.forEach(section => {

        section.classList.toggle(
            "active",
            section.id === `section-${sectionName}`
        );
    });


    const pageInfo = {
        inicio: {
            title: "Inicio",
            description: "Genera tickets profesionales fácilmente."
        },

        negocio: {
            title: "Mi negocio",
            description: "Configura los datos que aparecerán en tus tickets."
        },

        venta: {
            title: "Nueva venta",
            description: "Agrega productos y genera tu ticket."
        },

        historial: {
            title: "Historial",
            description: "Consulta las ventas guardadas localmente."
        },

        configuracion: {
            title: "Configuración",
            description: "Personaliza moneda y tamaño del ticket."
        }
    };


    const info = pageInfo[sectionName] || pageInfo.inicio;

    DOM.pageTitle.textContent = info.title;
    DOM.pageDescription.textContent = info.description;


    if (sectionName === "historial") {
        renderHistory();
    }

    if (sectionName === "venta") {
        updateTicket();
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   NEGOCIO
   ========================================================= */

function setupBusinessEvents() {

    DOM.businessForm.addEventListener(
        "submit",
        handleBusinessSubmit
    );


    DOM.businessLogo.addEventListener(
        "change",
        handleLogoUpload
    );


    DOM.removeLogo.addEventListener(
        "click",
        removeBusinessLogo
    );
}


function loadBusinessForm() {

    DOM.businessName.value =
        state.business.name || "";

    DOM.businessPhone.value =
        state.business.phone || "";

    DOM.businessWhatsapp.value =
        state.business.whatsapp || "";

    DOM.businessEmail.value =
        state.business.email || "";

    DOM.businessWeb.value =
        state.business.web || "";

    DOM.businessRfc.value =
        state.business.rfc || "";

    DOM.businessLocation.value =
        state.business.location || "";

    DOM.businessAddress.value =
        state.business.address || "";

    renderLogo();
}


function handleBusinessSubmit(event) {

    event.preventDefault();


    const name =
        DOM.businessName.value.trim();


    if (!name) {

        showToast(
            "Es necesario indicar el nombre del negocio."
        );

        DOM.businessName.focus();

        return;
    }


    state.business = {

        ...state.business,

        name,

        phone:
            DOM.businessPhone.value.trim(),

        whatsapp:
            DOM.businessWhatsapp.value.trim(),

        email:
            DOM.businessEmail.value.trim(),

        web:
            DOM.businessWeb.value.trim(),

        rfc:
            DOM.businessRfc.value.trim(),

        location:
            DOM.businessLocation.value.trim(),

        address:
            DOM.businessAddress.value.trim()
    };


    saveBusiness();

    updateBusinessPreview();

    showToast(
        "Datos del negocio guardados correctamente."
    );
}


/* =========================================================
   LOGO
   ========================================================= */

function handleLogoUpload(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }


    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        showToast(
            "Formato de logotipo no válido."
        );

        DOM.businessLogo.value = "";

        return;
    }


    const maxSize =
        5 * 1024 * 1024;


    if (file.size > maxSize) {

        showToast(
            "El logotipo no debe superar 5 MB."
        );

        DOM.businessLogo.value = "";

        return;
    }


    const reader =
        new FileReader();


    reader.onload = function () {

        const image =
            new Image();


        image.onload = function () {

            compressImage(
                image,
                500,
                500,
                0.85
            )
            .then(compressed => {

                state.business.logo =
                    compressed;

                saveBusiness();

                renderLogo();

                updateTicket();

                showToast(
                    "Logotipo guardado correctamente."
                );

            })
            .catch(error => {

                console.error(
                    "Error comprimiendo logo:",
                    error
                );

                showToast(
                    "No fue posible procesar el logotipo."
                );
            });
        };


        image.onerror = function () {

            showToast(
                "No fue posible leer el logotipo."
            );
        };


        image.src = reader.result;
    };


    reader.readAsDataURL(file);
}


function compressImage(
    image,
    maxWidth,
    maxHeight,
    quality
) {

    return new Promise((resolve, reject) => {

        try {

            let width = image.naturalWidth;
            let height = image.naturalHeight;


            if (!width || !height) {
                reject(
                    new Error("Imagen inválida")
                );

                return;
            }


            const ratio =
                Math.min(
                    maxWidth / width,
                    maxHeight / height,
                    1
                );


            width =
                Math.round(width * ratio);

            height =
                Math.round(height * ratio);


            const canvas =
                document.createElement("canvas");


            canvas.width = width;
            canvas.height = height;


            const context =
                canvas.getContext("2d");


            context.clearRect(
                0,
                0,
                width,
                height
            );


            context.drawImage(
                image,
                0,
                0,
                width,
                height
            );


            const result =
                canvas.toDataURL(
                    "image/webp",
                    quality
                );


            resolve(result);

        } catch (error) {

            reject(error);
        }
    });
}


function renderLogo() {

    if (!DOM.logoPreview) {
        return;
    }


    DOM.logoPreview.innerHTML = "";


    if (!state.business.logo) {

        DOM.removeLogo.classList.add("hidden");

        return;
    }


    const img =
        document.createElement("img");

    img.src =
        state.business.logo;

    img.alt =
        "Logotipo del negocio";


    DOM.logoPreview.appendChild(img);

    DOM.removeLogo.classList.remove("hidden");
}


function removeBusinessLogo() {

    state.business.logo = "";

    DOM.businessLogo.value = "";

    saveBusiness();

    renderLogo();

    updateTicket();

    showToast(
        "Logotipo eliminado."
    );
}


/* =========================================================
   ACTUALIZAR DATOS DE NEGOCIO
   ========================================================= */

function updateBusinessPreview() {

    const businessName =
        state.business.name.trim();


    if (businessName) {

        DOM.statBusiness.textContent =
            businessName;

    } else {

        DOM.statBusiness.textContent =
            "Sin configurar";
    }
}


/* =========================================================
   EVENTOS DE VENTA
   ========================================================= */

function setupSaleEvents() {

    DOM.addProduct.addEventListener(
        "click",
        () => addProduct()
    );


    DOM.enableTax.addEventListener(
        "change",
        () => {

            state.sale.taxEnabled =
                DOM.enableTax.checked;

            updateTicket();
        }
    );


    DOM.saleTax.addEventListener(
        "input",
        () => {

            state.sale.tax =
                sanitizeNumber(
                    DOM.saleTax.value
                );

            updateTicket();
        }
    );


    DOM.generalDiscount.addEventListener(
        "input",
        () => {

            state.sale.discount =
                sanitizeNumber(
                    DOM.generalDiscount.value
                );

            updateTicket();
        }
    );


    DOM.customerName.addEventListener(
        "input",
        () => {

            state.sale.customerName =
                DOM.customerName.value;

            updateTicket();
        }
    );


    DOM.customerPhone.addEventListener(
        "input",
        () => {

            state.sale.customerPhone =
                DOM.customerPhone.value;

            updateTicket();
        }
    );


    DOM.paymentMethod.addEventListener(
        "change",
        () => {

            state.sale.paymentMethod =
                DOM.paymentMethod.value;

            updateTicket();
        }
    );


    DOM.ticketNote.addEventListener(
        "input",
        () => {

            state.sale.note =
                DOM.ticketNote.value;

            updateTicket();
        }
    );


    DOM.clearSale.addEventListener(
        "click",
        clearCurrentSale
    );


    DOM.saveSale.addEventListener(
        "click",
        saveCurrentSale
    );


    DOM.downloadPng.addEventListener(
        "click",
        downloadTicketPNG
    );


    DOM.printTicket.addEventListener(
        "click",
        printTicket
    );
}


/* =========================================================
   PRODUCTOS
   ========================================================= */

function addProduct(productData = null) {

    if (
        state.sale.products.length >=
        APP_CONFIG.maxProducts
    ) {

        showToast(
            `Máximo ${APP_CONFIG.maxProducts} productos por venta.`
        );

        return;
    }


    const product = {

        id:
            generateId(),

        name:
            productData?.name || "",

        quantity:
            productData?.quantity ??
            1,

        price:
            productData?.price ??
            0
    };


    state.sale.products.push(product);

    renderProducts();

    updateTicket();


    setTimeout(() => {

        const input =
            document.querySelector(
                `[data-product-id="${product.id}"] [data-field="name"]`
            );

        if (input) {
            input.focus();
        }

    }, 50);
}


function removeProduct(productId) {

    state.sale.products =
        state.sale.products.filter(
            product =>
                product.id !== productId
        );


    renderProducts();

    updateTicket();

    showToast(
        "Producto eliminado."
    );
}


function renderProducts() {

    if (!DOM.productsContainer) {
        return;
    }


    if (state.sale.products.length === 0) {

        DOM.productsContainer.innerHTML = `
            <div class="empty-products">
                <div>🛒</div>
                <strong>No hay productos</strong>
                <span>
                    Agrega el primer producto para comenzar.
                </span>
            </div>
        `;

        return;
    }


    DOM.productsContainer.innerHTML =
        state.sale.products
            .map(product => createProductHTML(product))
            .join("");


    bindProductEvents();
}


function createProductHTML(product) {

    const total =
        getProductTotal(product);


    return `
        <div
            class="product-item"
            data-product-id="${escapeAttribute(product.id)}"
        >

            <div class="product-row">

                <div class="field">

                    <label>
                        Producto
                    </label>

                    <input
                        type="text"
                        maxlength="150"
                        data-field="name"
                        placeholder="Nombre del producto"
                        value="${escapeAttribute(product.name)}"
                    >

                </div>


                <div class="field">

                    <label>
                        Cantidad
                    </label>

                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        data-field="quantity"
                        value="${product.quantity}"
                    >

                </div>


                <div class="field">

                    <label>
                        Precio
                    </label>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-field="price"
                        value="${product.price}"
                    >

                </div>


                <div class="field">

                    <label>
                        Total
                    </label>

                    <input
                        type="text"
                        value="${escapeAttribute(formatMoney(total))}"
                        readonly
                        tabindex="-1"
                    >

                </div>


                <button
                    type="button"
                    class="remove-product"
                    data-action="remove"
                    title="Eliminar producto"
                >
                    ×
                </button>

            </div>


            <div class="product-total">

                <span>
                    Importe:
                </span>

                <strong>
                    ${escapeHTML(formatMoney(total))}
                </strong>

            </div>

        </div>
    `;
}


function bindProductEvents() {

    const productElements =
        DOM.productsContainer.querySelectorAll(
            ".product-item"
        );


    productElements.forEach(element => {

        const productId =
            element.dataset.productId;


        const product =
            state.sale.products.find(
                item =>
                    item.id === productId
            );


        if (!product) {
            return;
        }


        const nameInput =
            element.querySelector(
                '[data-field="name"]'
            );


        const quantityInput =
            element.querySelector(
                '[data-field="quantity"]'
            );


        const priceInput =
            element.querySelector(
                '[data-field="price"]'
            );


        const removeButton =
            element.querySelector(
                '[data-action="remove"]'
            );


        nameInput.addEventListener(
            "input",
            () => {

                product.name =
                    nameInput.value;

                updateTicket();
            }
        );


        quantityInput.addEventListener(
            "input",
            () => {

                let quantity =
                    parseFloat(
                        quantityInput.value
                    );


                if (
                    !Number.isFinite(quantity) ||
                    quantity < 0
                ) {
                    quantity = 0;
                }


                product.quantity =
                    quantity;

                updateProductDisplayedTotal(
                    element,
                    product
                );

                updateTicket();
            }
        );


        priceInput.addEventListener(
            "input",
            () => {

                let price =
                    parseFloat(
                        priceInput.value
                    );


                if (
                    !Number.isFinite(price) ||
                    price < 0
                ) {
                    price = 0;
                }


                product.price =
                    price;

                updateProductDisplayedTotal(
                    element,
                    product
                );

                updateTicket();
            }
        );


        removeButton.addEventListener(
            "click",
            () => removeProduct(productId)
        );
    });
}


function updateProductDisplayedTotal(
    element,
    product
) {

    const total =
        getProductTotal(product);


    const totalInput =
        element.querySelector(
            '[data-field="total"]'
        );


    const strong =
        element.querySelector(
            ".product-total strong"
        );


    if (totalInput) {
        totalInput.value =
            formatMoney(total);
    }


    if (strong) {
        strong.textContent =
            formatMoney(total);
    }
}


function getProductTotal(product) {

    const quantity =
        sanitizeNumber(product.quantity);

    const price =
        sanitizeNumber(product.price);

    return quantity * price;
}


/* =========================================================
   CÁLCULOS
   ========================================================= */

function calculateSale() {

    const subtotal =
        state.sale.products.reduce(
            (sum, product) =>
                sum +
                getProductTotal(product),
            0
        );


    let discount =
        sanitizeNumber(
            state.sale.discount
        );


    if (discount < 0) {
        discount = 0;
    }


    if (discount > subtotal) {
        discount = subtotal;
    }


    const base =
        Math.max(
            0,
            subtotal - discount
        );


    const taxRate =
        sanitizeNumber(
            state.sale.tax
        );


    const tax =
        state.sale.taxEnabled
            ? base * (taxRate / 100)
            : 0;


    const total =
        base + tax;


    return {
        subtotal,
        discount,
        base,
        taxRate,
        tax,
        total
    };
}


/* =========================================================
   TICKET
   ========================================================= */

function updateTicket() {

    syncSaleForm();

    updateNextTicketUI();

    const calculations =
        calculateSale();


    if (
        state.sale.products.length === 0 &&
        !hasTicketInformation()
    ) {

        renderEmptyTicket();

        return;
    }


    DOM.ticket.innerHTML =
        buildTicketHTML(
            calculations
        );
}


function hasTicketInformation() {

    return Boolean(
        state.business.name ||
        state.sale.customerName ||
        state.sale.customerPhone ||
        state.sale.paymentMethod ||
        state.sale.note
    );
}


function renderEmptyTicket() {

    DOM.ticket.innerHTML = `
        <div class="ticket-empty">

            <div class="ticket-empty-icon">
                🧾
            </div>

            <strong>
                Vista previa del ticket
            </strong>

            <span>
                Agrega productos para comenzar.
            </span>

        </div>
    `;
}


function buildTicketHTML(calculations) {

    const currency =
        state.settings.currency;


    const business =
        state.business;


    const products =
        state.sale.products
            .filter(product =>
                product.name.trim() ||
                getProductTotal(product) > 0
            );


    let logoHTML = "";

    if (business.logo) {

        logoHTML = `
            <img
                class="ticket-logo"
                src="${escapeAttribute(business.logo)}"
                alt="Logo"
            >
        `;
    }


    const businessInfo =
        buildBusinessInfoHTML();


    const customerHTML =
        buildCustomerHTML();


    const paymentHTML =
        state.sale.paymentMethod
            ? `
                <div class="ticket-payment">
                    Método de pago:
                    <strong>
                        ${escapeHTML(
                            state.sale.paymentMethod
                        )}
                    </strong>
                </div>
            `
            : "";


    const productsHTML =
        products.length > 0
            ? buildTicketProductsHTML(products)
            : `
                <div class="ticket-products">
                    <div
                        style="
                            text-align:center;
                            font-size:9px;
                            color:#777;
                        "
                    >
                        Sin productos registrados
                    </div>
                </div>
            `;


    const noteHTML =
        state.sale.note.trim()
            ? `
                <div class="ticket-note">
                    ${formatMultilineText(
                        state.sale.note
                    )}
                </div>
            `
            : "";


    return `
        <div class="ticket-header">

            ${logoHTML}

            <div class="ticket-business-name">
                ${escapeHTML(
                    business.name ||
                    "Mi negocio"
                )}
            </div>

            <div class="ticket-business-info">
                ${businessInfo}
            </div>

        </div>


        <div class="ticket-meta">

            <div class="ticket-meta-row">
                <span>
                    Ticket:
                </span>

                <strong>
                    ${escapeHTML(
                        formatTicketNumber(
                            state.sale.ticketNumber
                        )
                    )}
                </strong>
            </div>


            <div class="ticket-meta-row">
                <span>
                    Fecha:
                </span>

                <span>
                    ${formatDate(new Date())}
                </span>
            </div>


            <div class="ticket-meta-row">
                <span>
                    Hora:
                </span>

                <span>
                    ${formatTime(new Date())}
                </span>
            </div>

        </div>


        ${customerHTML}


        ${productsHTML}


        <div class="ticket-totals">

            <div class="ticket-total-row">

                <span>
                    Subtotal
                </span>

                <span>
                    ${formatMoney(
                        calculations.subtotal
                    )}
                </span>

            </div>


            ${
                calculations.discount > 0
                    ? `
                        <div class="ticket-total-row">

                            <span>
                                Descuento
                            </span>

                            <span>
                                -${formatMoney(
                                    calculations.discount
                                )}
                            </span>

                        </div>
                    `
                    : ""
            }


            ${
                state.sale.taxEnabled
                    ? `
                        <div class="ticket-total-row">

                            <span>
                                IVA (${formatNumber(
                                    calculations.taxRate
                                )}%)
                            </span>

                            <span>
                                ${formatMoney(
                                    calculations.tax
                                )}
                            </span>

                        </div>
                    `
                    : ""
            }


            <div class="ticket-grand-total">

                <span>
                    TOTAL
                </span>

                <span>
                    ${formatMoney(
                        calculations.total
                    )}
                </span>

            </div>

        </div>


        ${paymentHTML}


        ${noteHTML}


        <div class="ticket-thanks">
            ¡Gracias por su compra!
        </div>
    `;
}


function buildBusinessInfoHTML() {

    const values = [];


    if (state.business.phone) {
        values.push(
            `Tel: ${escapeHTML(state.business.phone)}`
        );
    }


    if (state.business.whatsapp) {
        values.push(
            `WhatsApp: ${escapeHTML(state.business.whatsapp)}`
        );
    }


    if (state.business.email) {
        values.push(
            escapeHTML(state.business.email)
        );
    }


    if (state.business.web) {
        values.push(
            escapeHTML(state.business.web)
        );
    }


    if (state.business.rfc) {
        values.push(
            `RFC: ${escapeHTML(state.business.rfc)}`
        );
    }


    if (state.business.location) {
        values.push(
            escapeHTML(state.business.location)
        );
    }


    if (state.business.address) {
        values.push(
            escapeHTML(state.business.address)
        );
    }


    if (values.length === 0) {
        return "";
    }


    return values.join("<br>");
}


function buildCustomerHTML() {

    if (
        !state.sale.customerName &&
        !state.sale.customerPhone
    ) {
        return "";
    }


    return `
        <div class="ticket-customer">

            <strong>
                Cliente
            </strong>

            ${
                state.sale.customerName
                    ? `
                        <br>
                        ${escapeHTML(
                            state.sale.customerName
                        )}
                    `
                    : ""
            }

            ${
                state.sale.customerPhone
                    ? `
                        <br>
                        Tel:
                        ${escapeHTML(
                            state.sale.customerPhone
                        )}
                    `
                    : ""
            }

        </div>
    `;
}


function buildTicketProductsHTML(products) {

    return `
        <div class="ticket-products">

            <div class="ticket-product-head">

                <span>
                    PRODUCTO
                </span>

                <span style="text-align:center;">
                    CANT.
                </span>

                <span style="text-align:right;">
                    IMPORTE
                </span>

            </div>


            ${products.map(product => {

                const total =
                    getProductTotal(product);


                return `
                    <div class="ticket-product">

                        <div class="ticket-product-name">
                            ${escapeHTML(
                                product.name ||
                                "Producto"
                            )}
                        </div>

                        <div class="ticket-product-qty">
                            ${formatNumber(
                                product.quantity
                            )}
                        </div>

                        <div class="ticket-product-price">
                            ${formatMoney(total)}
                        </div>

                    </div>
                `;

            }).join("")}

        </div>
    `;
}


/* =========================================================
   FORMULARIO DE VENTA
   ========================================================= */

function syncSaleForm() {

    if (!DOM.customerName) {
        return;
    }


    state.sale.customerName =
        DOM.customerName.value.trim();


    state.sale.customerPhone =
        DOM.customerPhone.value.trim();


    state.sale.paymentMethod =
        DOM.paymentMethod.value;


    state.sale.taxEnabled =
        DOM.enableTax.checked;


    state.sale.tax =
        sanitizeNumber(
            DOM.saleTax.value
        );


    state.sale.discount =
        sanitizeNumber(
            DOM.generalDiscount.value
        );


    state.sale.note =
        DOM.ticketNote.value.trim();
}


function loadSaleForm() {

    DOM.customerName.value =
        state.sale.customerName || "";

    DOM.customerPhone.value =
        state.sale.customerPhone || "";

    DOM.paymentMethod.value =
        state.sale.paymentMethod || "";

    DOM.enableTax.checked =
        state.sale.taxEnabled;

    DOM.saleTax.value =
        state.sale.tax;

    DOM.generalDiscount.value =
        state.sale.discount;

    DOM.ticketNote.value =
        state.sale.note || "";
}


/* =========================================================
   NUEVA VENTA / LIMPIAR
   ========================================================= */

function clearCurrentSale() {

    const hasData =
        state.sale.products.length > 0 ||
        state.sale.customerName ||
        state.sale.customerPhone ||
        state.sale.paymentMethod ||
        state.sale.note;


    if (hasData) {

        const confirmed =
            window.confirm(
                "¿Deseas limpiar la venta actual?"
            );

        if (!confirmed) {
            return;
        }
    }


    state.sale = {

        ticketNumber:
            state.sale.ticketNumber,

        customerName: "",

        customerPhone: "",

        paymentMethod: "",

        products: [],

        taxEnabled:
            APP_CONFIG.defaults.taxEnabled,

        tax:
            APP_CONFIG.defaults.tax,

        discount:
            APP_CONFIG.defaults.discount,

        note: ""
    };


    loadSaleForm();

    renderProducts();

    updateTicket();

    showToast(
        "Nueva venta preparada."
    );
}


/* =========================================================
   GUARDAR VENTA
   ========================================================= */

function saveCurrentSale() {

    syncSaleForm();


    if (!state.business.name.trim()) {

        showToast(
            "Primero configura el nombre del negocio."
        );

        navigateTo("negocio");

        DOM.businessName.focus();

        return;
    }


    const validProducts =
        state.sale.products.filter(
            product =>
                product.name.trim() &&
                product.quantity > 0 &&
                product.price >= 0
        );


    if (validProducts.length === 0) {

        showToast(
            "Agrega al menos un producto válido."
        );

        return;
    }


    state.sale.products =
        validProducts;


    const calculations =
        calculateSale();


    const ticketNumber =
        state.sale.ticketNumber;


    const sale = {

        id:
            generateId(),

        ticketNumber,

        createdAt:
            new Date().toISOString(),

        business:
            cloneObject(state.business),

        settings:
            cloneObject(state.settings),

        customerName:
            state.sale.customerName,

        customerPhone:
            state.sale.customerPhone,

        paymentMethod:
            state.sale.paymentMethod,

        products:
            cloneObject(
                state.sale.products
            ),

        taxEnabled:
            state.sale.taxEnabled,

        tax:
            state.sale.tax,

        discount:
            state.sale.discount,

        note:
            state.sale.note,

        calculations:
            cloneObject(calculations)
    };


    state.history.unshift(sale);

    saveHistory();


    state.sale.ticketNumber =
        ticketNumber + 1;

    saveNextTicket();


    updateNextTicketUI();

    renderHistory();

    showToast(
        `Venta ${formatTicketNumber(ticketNumber)} guardada correctamente.`
    );


    clearCurrentSaleWithoutConfirmation();
}


function clearCurrentSaleWithoutConfirmation() {

    state.sale.customerName = "";
    state.sale.customerPhone = "";
    state.sale.paymentMethod = "";
    state.sale.products = [];
    state.sale.taxEnabled =
        APP_CONFIG.defaults.taxEnabled;
    state.sale.tax =
        APP_CONFIG.defaults.tax;
    state.sale.discount =
        APP_CONFIG.defaults.discount;
    state.sale.note = "";

    loadSaleForm();

    renderProducts();

    updateTicket();
}


/* =========================================================
   HISTORIAL
   ========================================================= */

function setupHistoryEvents() {

    DOM.clearHistory.addEventListener(
        "click",
        clearAllHistory
    );


    DOM.historyContainer.addEventListener(
        "click",
        handleHistoryClick
    );
}


function renderHistory() {

    if (!DOM.historyContainer) {
        return;
    }


    if (state.history.length === 0) {

        DOM.historyContainer.innerHTML = `
            <div class="history-empty">

                <div class="history-empty-icon">
                    📋
                </div>

                <strong>
                    No hay ventas guardadas
                </strong>

                <span>
                    Las ventas que guardes aparecerán aquí.
                </span>

            </div>
        `;

        return;
    }


    DOM.historyContainer.innerHTML =
        state.history.map(
            sale => createHistoryHTML(sale)
        ).join("");
}


function createHistoryHTML(sale) {

    const total =
        sale.calculations?.total ??
        calculateSavedSaleTotal(sale);


    const customer =
        sale.customerName ||
        "Cliente general";


    return `
        <div
            class="history-item"
            data-history-id="${escapeAttribute(sale.id)}"
        >

            <div>

                <div class="history-ticket">
                    ${escapeHTML(
                        formatTicketNumber(
                            sale.ticketNumber
                        )
                    )}
                </div>

                <div class="history-date">
                    ${formatDateTime(
                        sale.createdAt
                    )}
                    ·
                    ${escapeHTML(customer)}
                </div>

            </div>


            <div class="history-total">
                ${formatMoney(
                    total,
                    sale.settings?.currency ||
                    state.settings.currency
                )}
            </div>


            <div class="history-actions">

                <button
                    type="button"
                    data-history-action="view"
                >
                    Ver
                </button>

                <button
                    type="button"
                    data-history-action="reuse"
                >
                    Usar
                </button>

                <button
                    type="button"
                    data-history-action="delete"
                >
                    Eliminar
                </button>

            </div>

        </div>
    `;
}


function handleHistoryClick(event) {

    const button =
        event.target.closest(
            "[data-history-action]"
        );


    if (!button) {
        return;
    }


    const item =
        button.closest(".history-item");


    if (!item) {
        return;
    }


    const id =
        item.dataset.historyId;


    const action =
        button.dataset.historyAction;


    const sale =
        state.history.find(
            item =>
                item.id === id
        );


    if (!sale) {
        return;
    }


    if (action === "view") {

        openHistoryModal(sale);

        return;
    }


    if (action === "reuse") {

        reuseSale(sale);

        return;
    }


    if (action === "delete") {

        deleteHistorySale(id);
    }
}


function deleteHistorySale(id) {

    const sale =
        state.history.find(
            item =>
                item.id === id
        );


    if (!sale) {
        return;
    }


    const confirmed =
        window.confirm(
            `¿Eliminar el ticket ${formatTicketNumber(
                sale.ticketNumber
            )} del historial?`
        );


    if (!confirmed) {
        return;
    }


    state.history =
        state.history.filter(
            item =>
                item.id !== id
        );


    saveHistory();

    renderHistory();

    showToast(
        "Venta eliminada del historial."
    );
}


function clearAllHistory() {

    if (state.history.length === 0) {

        showToast(
            "El historial ya está vacío."
        );

        return;
    }


    const confirmed =
        window.confirm(
            "¿Seguro que deseas eliminar TODO el historial? Esta acción no se puede deshacer."
        );


    if (!confirmed) {
        return;
    }


    state.history = [];

    saveHistory();

    renderHistory();

    showToast(
        "Historial eliminado."
    );
}


/* =========================================================
   MODAL HISTORIAL
   ========================================================= */

function setupModalEvents() {

    if (!DOM.historyModal) {
        return;
    }


    DOM.historyModal
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                closeHistoryModal
            );
        });


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !DOM.historyModal.classList.contains(
                    "hidden"
                )
            ) {
                closeHistoryModal();
            }
        }
    );
}


function openHistoryModal(sale) {

    const calculations =
        sale.calculations ||
        calculateSavedSale(sale);


    const currency =
        sale.settings?.currency ||
        state.settings.currency;


    DOM.historyModalContent.innerHTML = `

        <div>

            <h2 style="margin-bottom:6px;">
                Ticket
                ${escapeHTML(
                    formatTicketNumber(
                        sale.ticketNumber
                    )
                )}
            </h2>

            <p
                style="
                    color:#6b7280;
                    font-size:13px;
                    margin-bottom:20px;
                "
            >
                ${formatDateTime(
                    sale.createdAt
                )}
            </p>


            <div
                style="
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    padding:15px;
                    margin-bottom:15px;
                "
            >

                <strong>
                    Cliente
                </strong>

                <p
                    style="
                        margin-top:6px;
                        color:#6b7280;
                        font-size:13px;
                    "
                >
                    ${escapeHTML(
                        sale.customerName ||
                        "Cliente general"
                    )}

                    ${
                        sale.customerPhone
                            ? `
                                <br>
                                ${escapeHTML(
                                    sale.customerPhone
                                )}
                            `
                            : ""
                    }
                </p>

            </div>


            <div
                style="
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    overflow:hidden;
                    margin-bottom:15px;
                "
            >

                ${sale.products.map(product => `

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:15px;
                            padding:12px 15px;
                            border-bottom:1px solid #f0f0f0;
                        "
                    >

                        <div>

                            <strong
                                style="
                                    display:block;
                                    font-size:13px;
                                "
                            >
                                ${escapeHTML(
                                    product.name
                                )}
                            </strong>

                            <small
                                style="
                                    color:#6b7280;
                                "
                            >
                                ${formatNumber(
                                    product.quantity
                                )}
                                ×
                                ${formatMoney(
                                    product.price,
                                    currency
                                )}
                            </small>

                        </div>

                        <strong>
                            ${formatMoney(
                                getProductTotal(product),
                                currency
                            )}
                        </strong>

                    </div>

                `).join("")}

            </div>


            <div
                style="
                    text-align:right;
                    font-size:13px;
                "
            >

                <div>
                    Subtotal:
                    <strong>
                        ${formatMoney(
                            calculations.subtotal,
                            currency
                        )}
                    </strong>
                </div>


                ${
                    calculations.discount > 0
                        ? `
                            <div style="margin-top:5px;">
                                Descuento:
                                <strong>
                                    -${formatMoney(
                                        calculations.discount,
                                        currency
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }


                ${
                    sale.taxEnabled
                        ? `
                            <div style="margin-top:5px;">
                                IVA:
                                <strong>
                                    ${formatMoney(
                                        calculations.tax,
                                        currency
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }


                <div
                    style="
                        margin-top:12px;
                        padding-top:12px;
                        border-top:1px solid #111827;
                        font-size:18px;
                    "
                >
                    TOTAL:
                    <strong>
                        ${formatMoney(
                            calculations.total,
                            currency
                        )}
                    </strong>
                </div>

            </div>


            ${
                sale.paymentMethod
                    ? `
                        <p
                            style="
                                margin-top:15px;
                                font-size:12px;
                                text-align:center;
                            "
                        >
                            Método de pago:
                            <strong>
                                ${escapeHTML(
                                    sale.paymentMethod
                                )}
                            </strong>
                        </p>
                    `
                    : ""
            }


            ${
                sale.note
                    ? `
                        <div
                            style="
                                margin-top:15px;
                                padding:12px;
                                background:#f8fafc;
                                border-radius:10px;
                                font-size:12px;
                                color:#475569;
                            "
                        >
                            ${formatMultilineText(
                                sale.note
                            )}
                        </div>
                    `
                    : ""
            }

        </div>
    `;


    DOM.historyModal.classList.remove(
        "hidden"
    );
}


function closeHistoryModal() {

    DOM.historyModal.classList.add(
        "hidden"
    );
}


/* =========================================================
   REUTILIZAR VENTA
   ========================================================= */

function reuseSale(sale) {

    const confirmed =
        window.confirm(
            "La venta actual será reemplazada por los datos de este ticket. ¿Continuar?"
        );


    if (!confirmed) {
        return;
    }


    state.sale.customerName =
        sale.customerName || "";


    state.sale.customerPhone =
        sale.customerPhone || "";


    state.sale.paymentMethod =
        sale.paymentMethod || "";


    state.sale.products =
        cloneObject(
            sale.products || []
        ).map(product => ({

            ...product,

            id:
                generateId()

        }));


    state.sale.taxEnabled =
        sale.taxEnabled !== false;


    state.sale.tax =
        sanitizeNumber(
            sale.tax
        );


    state.sale.discount =
        sanitizeNumber(
            sale.discount
        );


    state.sale.note =
        sale.note || "";


    loadSaleForm();

    renderProducts();

    updateTicket();

    closeHistoryModal();

    navigateTo("venta");

    showToast(
        "Venta cargada nuevamente."
    );
}


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

function setupSettingsEvents() {

    DOM.currency.addEventListener(
        "change",
        () => {

            const value =
                DOM.currency.value;


            if (
                !["MXN", "USD", "EUR"]
                    .includes(value)
            ) {
                return;
            }


            state.settings.currency =
                value;


            saveSettings();

            updateTicket();
        }
    );


    DOM.ticketSize.addEventListener(
        "change",
        () => {

            const value =
                parseInt(
                    DOM.ticketSize.value,
                    10
                );


            if (![58, 80].includes(value)) {
                return;
            }


            state.settings.ticketSize =
                value;


            saveSettings();

            updateTicketSize();

            updateTicket();
        }
    );
}


function loadSettingsForm() {

    DOM.currency.value =
        state.settings.currency;


    DOM.ticketSize.value =
        String(
            state.settings.ticketSize
        );
}


function updateTicketSize() {

    const size =
        Number(
            state.settings.ticketSize
        ) === 58
            ? 58
            : 80;


    DOM.ticket.style.width =
        `${size}mm`;


    DOM.ticket.style.maxWidth =
        "100%";
}


/* =========================================================
   NÚMERO DE TICKET
   ========================================================= */

function updateNextTicketUI() {

    const formatted =
        formatTicketNumber(
            state.sale.ticketNumber
        );


    DOM.currentTicket.textContent =
        formatted;


    DOM.statTicket.textContent =
        formatted;
}


function formatTicketNumber(number) {

    const value =
        parseInt(number, 10);


    if (
        !Number.isFinite(value) ||
        value < 1
    ) {
        return "#000001";
    }


    return `#${String(value).padStart(6, "0")}`;
}


/* =========================================================
   PNG
   ========================================================= */

async function downloadTicketPNG() {

    if (
        typeof html2canvas ===
        "undefined"
    ) {

        showToast(
            "La librería para generar PNG todavía no está disponible."
        );

        return;
    }


    syncSaleForm();

    updateTicket();


    if (
        !state.sale.products.length &&
        !hasTicketInformation()
    ) {

        showToast(
            "Primero agrega información al ticket."
        );

        return;
    }


    const ticket =
        DOM.ticket;


    const originalWidth =
        ticket.style.width;


    try {

        showToast(
            "Generando imagen..."
        );


        /*
         * Creamos un clon para que la descarga
         * tenga el tamaño real del ticket y
         * no dependa del escalado de la pantalla.
         */

        const clone =
            ticket.cloneNode(true);


        clone.style.position =
            "absolute";

        clone.style.left =
            "-100000px";

        clone.style.top =
            "0";

        clone.style.width =
            `${state.settings.ticketSize}mm`;

        clone.style.maxWidth =
            `${state.settings.ticketSize}mm`;

        clone.style.boxShadow =
            "none";

        clone.style.margin =
            "0";


        document.body.appendChild(clone);


        const canvas =
            await html2canvas(
                clone,
                {
                    scale: 3,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false
                }
            );


        clone.remove();


        const dataURL =
            canvas.toDataURL(
                "image/png"
            );


        const link =
            document.createElement("a");


        link.href =
            dataURL;


        link.download =
            `ticket-${String(
                state.sale.ticketNumber
            ).padStart(6, "0")}.png`;


        document.body.appendChild(link);

        link.click();

        link.remove();


        showToast(
            "PNG generado correctamente."
        );

    } catch (error) {

        console.error(
            "Error generando PNG:",
            error
        );


        showToast(
            "No fue posible generar el PNG."
        );

    } finally {

        ticket.style.width =
            originalWidth;
    }
}


/* =========================================================
   IMPRIMIR
   ========================================================= */

function printTicket() {

    syncSaleForm();

    updateTicket();


    if (
        state.sale.products.length === 0 &&
        !hasTicketInformation()
    ) {

        showToast(
            "No hay información para imprimir."
        );

        return;
    }


    const originalTitle =
        document.title;


    document.title =
        `Ticket ${formatTicketNumber(
            state.sale.ticketNumber
        )}`;


    window.print();


    setTimeout(() => {

        document.title =
            originalTitle;

    }, 1000);
}


/* =========================================================
   UTILIDADES
   ========================================================= */

function sanitizeNumber(value) {

    const number =
        parseFloat(value);


    if (!Number.isFinite(number)) {
        return 0;
    }


    return Math.max(
        0,
        number
    );
}


function formatMoney(
    amount,
    currency = state.settings.currency
) {

    const safeAmount =
        Number.isFinite(
            Number(amount)
        )
            ? Number(amount)
            : 0;


    const locale =
        APP_CONFIG.currencyLocales[
            currency
        ] || "es-MX";


    try {

        return new Intl.NumberFormat(
            locale,
            {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(safeAmount);

    } catch (error) {

        return `$${safeAmount.toFixed(2)}`;
    }
}


function formatNumber(value) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {
        return "0";
    }


    return new Intl.NumberFormat(
        "es-MX",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(number);
}


function formatDate(date) {

    const value =
        date instanceof Date
            ? date
            : new Date(date);


    if (
        Number.isNaN(
            value.getTime()
        )
    ) {
        return "";
    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(value);
}


function formatTime(date) {

    const value =
        date instanceof Date
            ? date
            : new Date(date);


    if (
        Number.isNaN(
            value.getTime()
        )
    ) {
        return "";
    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(value);
}


function formatDateTime(date) {

    const value =
        date instanceof Date
            ? date
            : new Date(date);


    if (
        Number.isNaN(
            value.getTime()
        )
    ) {
        return "";
    }


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(value);
}


function formatMultilineText(text) {

    return escapeHTML(
        String(text || "")
    )
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n/g, "<br>");
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


function generateId() {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();
    }


    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}


function cloneObject(object) {

    try {

        return JSON.parse(
            JSON.stringify(object)
        );

    } catch (error) {

        return null;
    }
}


/* =========================================================
   HISTORIAL - CÁLCULOS ANTIGUOS
   ========================================================= */

function calculateSavedSale(sale) {

    const subtotal =
        (sale.products || []).reduce(
            (sum, product) =>
                sum +
                getProductTotal(product),
            0
        );


    const discount =
        Math.min(
            subtotal,
            sanitizeNumber(
                sale.discount
            )
        );


    const base =
        Math.max(
            0,
            subtotal - discount
        );


    const taxRate =
        sanitizeNumber(
            sale.tax
        );


    const tax =
        sale.taxEnabled
            ? base * (taxRate / 100)
            : 0;


    const total =
        base + tax;


    return {
        subtotal,
        discount,
        base,
        taxRate,
        tax,
        total
    };
}


function calculateSavedSaleTotal(sale) {

    return calculateSavedSale(
        sale
    ).total;
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


function showToast(message) {

    if (
        !DOM.toast ||
        !DOM.toastMessage
    ) {
        return;
    }


    DOM.toastMessage.textContent =
        message;


    DOM.toast.classList.add(
        "show"
    );


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(() => {

            DOM.toast.classList.remove(
                "show"
            );

        }, 3000);
}


/* =========================================================
   ATAJOS DE TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Ctrl + N
         * Nueva venta
         */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "n"
        ) {

            event.preventDefault();

            navigateTo("venta");

            return;
        }


        /*
         * Ctrl + S
         * Guardar venta
         */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "s"
        ) {

            event.preventDefault();

            const ventaSection =
                document.getElementById(
                    "section-venta"
                );


            if (
                ventaSection &&
                ventaSection.classList.contains(
                    "active"
                )
            ) {
                saveCurrentSale();
            }
        }
    }
);


/* =========================================================
   VALIDACIÓN GENERAL DE DATOS
   ========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "TicketPro error:",
            event.error || event.message
        );
    }
);


/* =========================================================
   EXPOSICIÓN OPCIONAL PARA DEBUG
   ========================================================= */

window.TicketPro = {

    state,

    navigateTo,

    addProduct,

    removeProduct,

    updateTicket,

    saveCurrentSale,

    clearCurrentSale,

    renderHistory,

    showToast
};