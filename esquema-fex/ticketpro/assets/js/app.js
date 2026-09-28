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

    maxTicketNumber: 999999999,

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
        note: "",
        qrLink: ""
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
    DOM.ticketNumberInput = document.getElementById("ticket-number");
    DOM.qrLink = document.getElementById("qr-link");
    DOM.qrHint = document.getElementById("qr-hint");

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
    DOM.downloadPdf = document.getElementById("download-pdf");
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


function safeSetItem(key, value) {

    try {

        localStorage.setItem(key, value);

        return true;

    } catch (error) {

        console.error("Error guardando en localStorage:", error);

        showToast(
            "No se pudo guardar en el navegador (almacenamiento lleno o bloqueado)."
        );

        return false;
    }
}


function saveBusiness() {

    return safeSetItem(
        APP_CONFIG.storageKeys.business,
        JSON.stringify(state.business)
    );
}


function saveSettings() {

    return safeSetItem(
        APP_CONFIG.storageKeys.settings,
        JSON.stringify(state.settings)
    );
}


function saveHistory() {

    return safeSetItem(
        APP_CONFIG.storageKeys.history,
        JSON.stringify(state.history)
    );
}


function saveNextTicket() {

    return safeSetItem(
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


    DOM.ticketNumberInput.addEventListener(
        "input",
        () => {

            const digits =
                DOM.ticketNumberInput.value
                    .replace(/\D/g, "");

            if (digits !== DOM.ticketNumberInput.value) {
                DOM.ticketNumberInput.value = digits;
            }

            const number =
                parseInt(digits, 10);

            if (
                Number.isFinite(number) &&
                number >= 1 &&
                number <= APP_CONFIG.maxTicketNumber
            ) {

                state.sale.ticketNumber =
                    number;

                updateTicket();
            }
        }
    );


    DOM.ticketNumberInput.addEventListener(
        "blur",
        () => {

            DOM.ticketNumberInput.value =
                String(state.sale.ticketNumber);
        }
    );


    DOM.qrLink.addEventListener(
        "input",
        () => {

            state.sale.qrLink =
                DOM.qrLink.value.trim();

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


    DOM.downloadPdf.addEventListener(
        "click",
        downloadTicketPDF
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
                        data-field="total"
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
        Math.min(
            100,
            sanitizeNumber(
                state.sale.tax
            )
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


    updateQrHint();


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


const QR_HINT_DEFAULT =
    "Opcional. Si lo llenas, el ticket mostrará al final un código QR con este enlace.";


function updateQrHint() {

    if (!DOM.qrHint) {
        return;
    }

    const link =
        normalizeQrLink(
            state.sale.qrLink
        );

    if (link && !getQrDataURL(link)) {

        DOM.qrHint.textContent =
            "El enlace es demasiado largo para generar el código QR.";

        DOM.qrHint.style.color =
            "var(--danger)";

        return;
    }

    DOM.qrHint.textContent =
        QR_HINT_DEFAULT;

    DOM.qrHint.style.color =
        "";
}


/*
 * Si el enlace parece una dirección web sin protocolo
 * (www.ejemplo.com, instagram.com/negocio) se le agrega https://
 * Cualquier otro texto se codifica tal cual (mailto:, tel:, texto libre...).
 */

function normalizeQrLink(value) {

    const link =
        String(value || "").trim();

    if (!link) {
        return "";
    }

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(link)) {
        return link;
    }

    if (/^\/\//.test(link)) {
        return `https:${link}`;
    }

    if (
        !/\s/.test(link) &&
        /^[^\s@]+\.[^\s@]{2,}/.test(link)
    ) {
        return `https://${link}`;
    }

    return link;
}


function buildQrHTML() {

    const link =
        normalizeQrLink(
            state.sale.qrLink
        );

    if (!link) {
        return "";
    }

    const source =
        getQrDataURL(link);

    if (!source) {
        return "";
    }

    let label =
        link.replace(/^https?:\/\//i, "");

    if (label.length > 60) {
        label = `${label.slice(0, 57)}...`;
    }

    return `
        <div class="ticket-qr">

            <img
                src="${escapeAttribute(source)}"
                alt="Código QR"
            >

            <div class="ticket-qr-text">
                ${escapeHTML(label)}
            </div>

        </div>
    `;
}


function hasTicketInformation() {

    return Boolean(
        state.business.name ||
        state.sale.customerName ||
        state.sale.customerPhone ||
        state.sale.paymentMethod ||
        state.sale.note ||
        state.sale.qrLink
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


        ${buildQrHTML()}
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


    state.sale.qrLink =
        DOM.qrLink.value.trim();
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

    DOM.qrLink.value =
        state.sale.qrLink || "";
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
        state.sale.note ||
        state.sale.qrLink;


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

        note: "",

        qrLink: ""
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


    const duplicatedTicket =
        state.history.some(
            item =>
                Number(item.ticketNumber) ===
                Number(state.sale.ticketNumber)
        );


    if (duplicatedTicket) {

        const confirmed =
            window.confirm(
                `El ticket ${formatTicketNumber(
                    state.sale.ticketNumber
                )} ya existe en el historial. ¿Guardar de todas formas?`
            );

        if (!confirmed) {
            return;
        }
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

        business: {
            ...cloneObject(state.business),
            logo: ""
        },

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

        qrLink:
            state.sale.qrLink,

        calculations:
            cloneObject(calculations)
    };


    state.history.unshift(sale);

    if (!saveHistory()) {

        state.history.shift();

        return;
    }


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
    state.sale.qrLink = "";

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
                sale.qrLink
                    ? `
                        <div
                            style="
                                margin-top:15px;
                                text-align:center;
                                font-size:12px;
                                word-break:break-all;
                            "
                        >
                            ${
                                getQrDataURL(normalizeQrLink(sale.qrLink))
                                    ? `<img
                                        src="${escapeAttribute(getQrDataURL(normalizeQrLink(sale.qrLink)))}"
                                        alt="Código QR"
                                        style="
                                            width:120px;
                                            height:120px;
                                            display:block;
                                            margin:0 auto 6px;
                                        "
                                    >`
                                    : ""
                            }
                            Enlace QR:
                            <strong>
                                ${escapeHTML(sale.qrLink)}
                            </strong>
                        </div>
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


    state.sale.qrLink =
        sale.qrLink || "";


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


    let printStyle =
        document.getElementById("print-page-style");

    if (!printStyle) {

        printStyle =
            document.createElement("style");

        printStyle.id =
            "print-page-style";

        document.head.appendChild(printStyle);
    }

    printStyle.textContent =
        `@media print { @page { size: ${size}mm auto; margin: 0; } }`;
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


    if (
        DOM.ticketNumberInput &&
        document.activeElement !== DOM.ticketNumberInput
    ) {

        DOM.ticketNumberInput.value =
            String(state.sale.ticketNumber);
    }
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

async function captureTicketCanvas() {

    /*
     * Creamos un clon para que la descarga
     * tenga el tamaño real del ticket y
     * no dependa del escalado de la pantalla.
     */

    const clone =
        DOM.ticket.cloneNode(true);


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


    try {

        return await html2canvas(
            clone,
            {
                scale: 3,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false
            }
        );

    } finally {

        clone.remove();
    }
}


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


    try {

        showToast(
            "Generando imagen..."
        );


        const canvas =
            await captureTicketCanvas();


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
    }
}


/* =========================================================
   PDF
   ========================================================= */

async function downloadTicketPDF() {

    if (
        typeof html2canvas === "undefined" ||
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showToast(
            "Las librerías para generar PDF todavía no están disponibles."
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


    try {

        showToast(
            "Generando PDF..."
        );


        const canvas =
            await captureTicketCanvas();


        const widthMm =
            Number(state.settings.ticketSize) === 58
                ? 58
                : 80;


        const heightMm =
            canvas.height * widthMm / canvas.width;


        const pdf =
            new window.jspdf.jsPDF({
                orientation:
                    heightMm >= widthMm
                        ? "portrait"
                        : "landscape",
                unit: "mm",
                format: [widthMm, heightMm]
            });


        pdf.addImage(
            canvas.toDataURL("image/png"),
            "PNG",
            0,
            0,
            widthMm,
            heightMm
        );


        pdf.save(
            `ticket-${String(
                state.sale.ticketNumber
            ).padStart(6, "0")}.pdf`
        );


        showToast(
            "PDF generado correctamente."
        );

    } catch (error) {

        console.error(
            "Error generando PDF:",
            error
        );


        showToast(
            "No fue posible generar el PDF."
        );
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
   GENERADOR DE CÓDIGO QR
   Sin librerías externas · funciona sin internet.
   Modo byte (UTF-8) · corrección de errores nivel M ·
   versiones 1 a 14 (hasta 362 bytes).
   ========================================================= */

const QRGen = (function () {

    /* [bytes de corrección por bloque, [[cantidad de bloques, bytes de datos], ...]] */
    const EC_M = {
        1: [10, [[1, 16]]],
        2: [16, [[1, 28]]],
        3: [26, [[1, 44]]],
        4: [18, [[2, 32]]],
        5: [24, [[2, 43]]],
        6: [16, [[4, 27]]],
        7: [18, [[4, 31]]],
        8: [22, [[2, 38], [2, 39]]],
        9: [22, [[3, 36], [2, 37]]],
        10: [26, [[4, 43], [1, 44]]],
        11: [30, [[1, 50], [4, 51]]],
        12: [22, [[6, 36], [2, 37]]],
        13: [22, [[8, 37], [1, 38]]],
        14: [24, [[4, 40], [5, 41]]]
    };

    const ALIGN = {
        1: [],
        2: [6, 18],
        3: [6, 22],
        4: [6, 26],
        5: [6, 30],
        6: [6, 34],
        7: [6, 22, 38],
        8: [6, 24, 42],
        9: [6, 26, 46],
        10: [6, 28, 50],
        11: [6, 30, 54],
        12: [6, 32, 58],
        13: [6, 34, 62],
        14: [6, 26, 46, 66]
    };

    const MAX_VERSION = 14;

    /* ---------- Campo de Galois GF(256) ---------- */

    const EXP = new Array(512).fill(0);
    const LOG = new Array(256).fill(0);

    (function initGaloisField() {

        let value = 1;

        for (let i = 0; i < 255; i++) {

            EXP[i] = value;
            LOG[value] = i;

            value <<= 1;

            if (value & 0x100) {
                value ^= 0x11d;
            }
        }

        for (let i = 255; i < 512; i++) {
            EXP[i] = EXP[i - 255];
        }
    })();

    function gfMul(a, b) {
        return (a === 0 || b === 0)
            ? 0
            : EXP[LOG[a] + LOG[b]];
    }

    function rsDivisor(degree) {

        const result = new Array(degree).fill(0);

        result[degree - 1] = 1;

        let root = 1;

        for (let i = 0; i < degree; i++) {

            for (let j = 0; j < degree; j++) {

                result[j] = gfMul(result[j], root);

                if (j + 1 < degree) {
                    result[j] ^= result[j + 1];
                }
            }

            root = gfMul(root, 2);
        }

        return result;
    }

    function rsRemainder(data, divisor) {

        const result = divisor.map(() => 0);

        data.forEach(byte => {

            const factor = byte ^ result.shift();

            result.push(0);

            divisor.forEach((coef, i) => {
                result[i] ^= gfMul(coef, factor);
            });
        });

        return result;
    }

    /* ---------- Datos ---------- */

    function getBit(value, index) {
        return ((value >>> index) & 1) !== 0;
    }

    function dataCapacity(version) {
        return EC_M[version][1].reduce(
            (sum, [count, len]) => sum + count * len,
            0
        );
    }

    function chooseVersion(byteLength) {

        for (let v = 1; v <= MAX_VERSION; v++) {

            const countBits = v < 10 ? 8 : 16;

            if (4 + countBits + 8 * byteLength <= dataCapacity(v) * 8) {
                return v;
            }
        }

        return 0;
    }

    function buildCodewords(bytes, version) {

        const [ecLength, groups] = EC_M[version];

        const capacity = dataCapacity(version);

        const bits = [];

        const push = (value, length) => {
            for (let i = length - 1; i >= 0; i--) {
                bits.push((value >>> i) & 1);
            }
        };

        push(0b0100, 4);
        push(bytes.length, version < 10 ? 8 : 16);
        bytes.forEach(byte => push(byte, 8));

        push(0, Math.min(4, capacity * 8 - bits.length));

        while (bits.length % 8 !== 0) {
            bits.push(0);
        }

        const data = [];

        for (let i = 0; i < bits.length; i += 8) {
            data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
        }

        for (let pad = 0xEC; data.length < capacity; pad ^= (0xEC ^ 0x11)) {
            data.push(pad);
        }

        const divisor = rsDivisor(ecLength);

        const blocks = [];

        let offset = 0;

        groups.forEach(([count, length]) => {

            for (let i = 0; i < count; i++) {

                const blockData = data.slice(offset, offset + length);

                offset += length;

                blocks.push({
                    data: blockData,
                    ec: rsRemainder(blockData, divisor)
                });
            }
        });

        const result = [];

        const maxLength = Math.max(...blocks.map(b => b.data.length));

        for (let i = 0; i < maxLength; i++) {
            blocks.forEach(block => {
                if (i < block.data.length) {
                    result.push(block.data[i]);
                }
            });
        }

        for (let i = 0; i < ecLength; i++) {
            blocks.forEach(block => result.push(block.ec[i]));
        }

        return result;
    }

    /* ---------- Matriz ---------- */

    function createMatrix(codewords, version) {

        const size = 17 + version * 4;

        const modules = Array.from({ length: size }, () => new Array(size).fill(false));
        const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

        const setFunction = (x, y, dark) => {
            modules[y][x] = dark;
            isFunction[y][x] = true;
        };

        /* Patrones de temporización */

        for (let i = 0; i < size; i++) {
            setFunction(6, i, i % 2 === 0);
            setFunction(i, 6, i % 2 === 0);
        }

        /* Patrones de posición */

        const drawFinder = (cx, cy) => {

            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {

                    const distance = Math.max(Math.abs(dx), Math.abs(dy));

                    const x = cx + dx;
                    const y = cy + dy;

                    if (x >= 0 && x < size && y >= 0 && y < size) {
                        setFunction(x, y, distance !== 2 && distance !== 4);
                    }
                }
            }
        };

        drawFinder(3, 3);
        drawFinder(size - 4, 3);
        drawFinder(3, size - 4);

        /* Patrones de alineación */

        const positions = ALIGN[version];

        positions.forEach((cy, i) => {
            positions.forEach((cx, j) => {

                const overlapsFinder =
                    (i === 0 && j === 0) ||
                    (i === 0 && j === positions.length - 1) ||
                    (i === positions.length - 1 && j === 0);

                if (overlapsFinder) {
                    return;
                }

                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        setFunction(
                            cx + dx,
                            cy + dy,
                            Math.max(Math.abs(dx), Math.abs(dy)) !== 1
                        );
                    }
                }
            });
        });

        /* Información de formato */

        const drawFormat = mask => {

            const data = (0 << 3) | mask; /* nivel M = 00 */

            let remainder = data;

            for (let i = 0; i < 10; i++) {
                remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
            }

            const bits = ((data << 10) | remainder) ^ 0x5412;

            for (let i = 0; i <= 5; i++) {
                setFunction(8, i, getBit(bits, i));
            }

            setFunction(8, 7, getBit(bits, 6));
            setFunction(8, 8, getBit(bits, 7));
            setFunction(7, 8, getBit(bits, 8));

            for (let i = 9; i < 15; i++) {
                setFunction(14 - i, 8, getBit(bits, i));
            }

            for (let i = 0; i < 8; i++) {
                setFunction(size - 1 - i, 8, getBit(bits, i));
            }

            for (let i = 8; i < 15; i++) {
                setFunction(8, size - 15 + i, getBit(bits, i));
            }

            setFunction(8, size - 8, true);
        };

        drawFormat(0);

        /* Información de versión */

        if (version >= 7) {

            let remainder = version;

            for (let i = 0; i < 12; i++) {
                remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1F25);
            }

            const bits = (version << 12) | remainder;

            for (let i = 0; i < 18; i++) {

                const bit = getBit(bits, i);

                const a = size - 11 + (i % 3);
                const b = Math.floor(i / 3);

                setFunction(a, b, bit);
                setFunction(b, a, bit);
            }
        }

        /* Colocación de los datos */

        let bitIndex = 0;

        for (let right = size - 1; right >= 1; right -= 2) {

            if (right === 6) {
                right = 5;
            }

            for (let vert = 0; vert < size; vert++) {

                for (let j = 0; j < 2; j++) {

                    const x = right - j;

                    const upward = ((right + 1) & 2) === 0;

                    const y = upward ? size - 1 - vert : vert;

                    if (!isFunction[y][x] && bitIndex < codewords.length * 8) {

                        modules[y][x] = getBit(
                            codewords[bitIndex >>> 3],
                            7 - (bitIndex & 7)
                        );

                        bitIndex++;
                    }
                }
            }
        }

        /* Máscara */

        const maskFunctions = [
            (x, y) => (x + y) % 2 === 0,
            (x, y) => y % 2 === 0,
            (x, y) => x % 3 === 0,
            (x, y) => (x + y) % 3 === 0,
            (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
            (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
            (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
            (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
        ];

        const applyMask = mask => {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (!isFunction[y][x] && maskFunctions[mask](x, y)) {
                        modules[y][x] = !modules[y][x];
                    }
                }
            }
        };

        let bestMask = 0;
        let bestPenalty = Infinity;

        for (let mask = 0; mask < 8; mask++) {

            applyMask(mask);
            drawFormat(mask);

            const score = penaltyScore(modules, size);

            if (score < bestPenalty) {
                bestPenalty = score;
                bestMask = mask;
            }

            applyMask(mask);
        }

        applyMask(bestMask);
        drawFormat(bestMask);

        return modules;
    }

    function countOccurrences(text, pattern) {

        let count = 0;

        let index = text.indexOf(pattern);

        while (index !== -1) {
            count++;
            index = text.indexOf(pattern, index + 1);
        }

        return count;
    }

    function penaltyScore(modules, size) {

        let result = 0;

        for (let direction = 0; direction < 2; direction++) {

            for (let a = 0; a < size; a++) {

                let line = "";
                let runColor = null;
                let runLength = 0;

                for (let b = 0; b < size; b++) {

                    const dark = direction === 0
                        ? modules[a][b]
                        : modules[b][a];

                    line += dark ? "1" : "0";

                    if (dark === runColor) {

                        runLength++;

                        if (runLength === 5) {
                            result += 3;
                        } else if (runLength > 5) {
                            result += 1;
                        }

                    } else {
                        runColor = dark;
                        runLength = 1;
                    }
                }

                result += 40 * countOccurrences(line, "10111010000");
                result += 40 * countOccurrences(line, "00001011101");
            }
        }

        let darkCount = 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {

                if (modules[y][x]) {
                    darkCount++;
                }

                if (
                    x < size - 1 &&
                    y < size - 1 &&
                    modules[y][x] === modules[y][x + 1] &&
                    modules[y][x] === modules[y + 1][x] &&
                    modules[y][x] === modules[y + 1][x + 1]
                ) {
                    result += 3;
                }
            }
        }

        const total = size * size;

        result += (Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * 10;

        return result;
    }

    /* ---------- API pública ---------- */

    function utf8Bytes(text) {

        if (typeof TextEncoder !== "undefined") {
            return Array.from(new TextEncoder().encode(text));
        }

        return Array.from(unescape(encodeURIComponent(text)), char => char.charCodeAt(0));
    }

    /* Devuelve una matriz de booleanos (true = módulo oscuro) o null si no cabe. */

    function matrix(text) {

        const bytes = utf8Bytes(String(text));

        if (bytes.length === 0) {
            return null;
        }

        const version = chooseVersion(bytes.length);

        if (!version) {
            return null;
        }

        return createMatrix(buildCodewords(bytes, version), version);
    }

    return { matrix };
})();


const qrCache = new Map();

/* Genera el QR como imagen PNG (data URL). Devuelve "" si no es posible. */

function getQrDataURL(text) {

    if (!text) {
        return "";
    }

    if (qrCache.has(text)) {
        return qrCache.get(text);
    }

    let result = "";

    try {

        const modules = QRGen.matrix(text);

        if (modules) {

            const quiet = 2;

            const count = modules.length + quiet * 2;

            const pixel = Math.max(4, Math.ceil(400 / count));

            const canvas = document.createElement("canvas");

            canvas.width = count * pixel;
            canvas.height = count * pixel;

            const context = canvas.getContext("2d");

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.fillStyle = "#000000";

            modules.forEach((row, y) => {
                row.forEach((dark, x) => {
                    if (dark) {
                        context.fillRect(
                            (x + quiet) * pixel,
                            (y + quiet) * pixel,
                            pixel,
                            pixel
                        );
                    }
                });
            });

            result = canvas.toDataURL("image/png");
        }

    } catch (error) {
        console.error("Error generando QR:", error);
    }

    if (qrCache.size > 50) {
        qrCache.clear();
    }

    qrCache.set(text, result);

    return result;
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