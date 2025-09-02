let id,
	oldActiveComponentIds = [],
	dealStage;
ZOHO.embeddedApp.on("PageLoad", function (data) {
	ZOHO.CRM.UI.Resize({ height: "500", width: "5000" })
	includeFieldsForTabbing();
	id = data.EntityId
	ZOHO.CRM.API.getRecord({
		Entity: "Deals",
		RecordID: id,
	}).then(function (data) {
		document.getElementsByClassName("deal-name").value = data.data[0].Deal_Name;
		// added to change condition for disabling widget edit buttons
		dealRFQCheckbox = data.data[0].RFQ_Send_to_Vendor;
		disableActionsInWidgetForm(dealRFQCheckbox);
		// dealStage = data.data[0].Stage;
		// disableActionsInWidgetForm(dealStage);
		ZOHO.CRM.API.getRelatedRecords({
			Entity: "Deals",
			RecordID: id,
			RelatedList: "Component_Lists"
		})
			.then(function (data) {
				if (data.data) {
					let hasActiveComponent = false;
					data.data.forEach(component => {
						if (component.Status == "Active") {
							// console.log("yo");
							hasActiveComponent = true;
							oldActiveComponentIds.push(component.id)
							let componentData = {
								"Id": component.id,
								"Name": component.Name,
								"Product": {
									"Name": component.Product.name,
									"Id": component.Product.id
								},
								"Specification": component.Specifications,
								"Quantity": component.Quantity,
							};
							ZOHO.CRM.API.searchRecord({
								Entity: "Components_X_Vendors",
								Type: "criteria",
								Query: "(Component:equals:" + component.id + ")"
							})
								.then(function (data) {
									bidders = [];
									if (data.data) {
										data.data.forEach(bidder => {
											bidders.push({
												"Name": bidder.Bidders.name,
												"Id": bidder.Bidders.id
											});
										});
									}
									componentData["Bidders"] = bidders;
									ZOHO.CRM.API.getRelatedRecords({
										Entity: "Components",
										RecordID: component.id,
										RelatedList: "Attachments",
										page: 1,
										per_page: 200
									})
										.then(function (data) {
											attachments = [];
											if (data.data) {
												data.data.forEach(attachment => {
													attachments.push({
														"Name": attachment.File_Name,
														"Id": attachment.id
													});
												});
											}
											componentData["Attachments"] = attachments;
											// pass on deal stage variable
											// appendComponentRow("allComponents", componentData, dealStage);
											// pass on rfq checkbox variable
											appendComponentRow("allComponents", componentData, dealRFQCheckbox);
										})
								})
						}
					});
					if (!hasActiveComponent) {
						console.log("hey");
						appendComponentRow("allComponents");
					}
				} else {
					console.log("sup");
					appendComponentRow("allComponents");
				}
			})

	})
})

ZOHO.embeddedApp.init()

function includeFieldsForTabbing() {
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Tab') {
			let activeField = document.activeElement;
			if (activeField.classList.contains('component-name')) {
				event.preventDefault();
				var productField = activeField.parentElement.parentElement.querySelector('.product-field-div');
				productField.click();
			} else if (activeField.classList.contains('qty-input-field')) {
				event.preventDefault();
				var bidderField = activeField.parentElement.parentElement.parentElement.querySelector('.bidders-field-div');
				bidderField.click();
			} else {
				activeField.parentElement.parentElement.click();
			}

		}
	});
}

// File Attachment

const fileLists = {};

function establishListenerOnFileField() {
	document.querySelectorAll('input[type="file"]').forEach((input, index) => {
		input.dataset.index = index;
		input.addEventListener('change', handleFileSelect);
	});
}

function handleFileSelect(event) {
	const input = event.target;
	const index = input.dataset.index;

	if (!fileLists[index]) {
		fileLists[index] = [];
	}

	const newFiles = Array.from(input.files);
	fileLists[index] = fileLists[index].concat(newFiles);

	displayFiles(fileLists[index], input.nextElementSibling, index);
	input.value = '';
	uploadFiles();
}

function displayFiles(files, fileInfoContainer, inputIndex) {
	fileInfoContainer.innerHTML = '';
	files.forEach((file, index) => {
		if (!undefined) {
			const fileItem = document.createElement('div');
			fileItem.className = 'file-item';
			fileItem.innerHTML = `
				<div class="flex file-name-container">
					<span data-input-index="${inputIndex}" data-file-index="${index}" class="file-name">${file.name} </span>
					<span data-input-index="${inputIndex}" data-file-index="${index}" class="remove-file close"></span>
				</div>
			`;
			fileInfoContainer.appendChild(fileItem);
		}
	});
	fileInfoContainer.querySelectorAll('.remove-file').forEach(button => {
		button.addEventListener('click', handleRemoveFile);
	});
}

function handleRemoveFile(event) {
	const button = event.target;
	const inputIndex = button.dataset.inputIndex;
	const fileIndex = button.dataset.fileIndex;

	fileLists[inputIndex] = fileLists[inputIndex].filter((_, i) => i != fileIndex);
	const input = document.querySelector(`input[data-index="${inputIndex}"]`);
	displayFiles(fileLists[inputIndex], input.nextElementSibling, inputIndex);
}


// Component Row

function appendComponentRow(tableId, existingComponentData) {
	const table = document.getElementById(tableId),
		tbody = table.querySelector('tbody'),
		trClassNames = existingComponentData ? ['existing-component', 'component-row'] : ['component-row'],
		newRow = createElementWithClass('tr', trClassNames),
		cellDataArray = [
			{ elementType: 'input', type: 'text', classes: ['component-name', 'required', 'required-data-field'], defaultValue: existingComponentData?.Name || "", errorMsg: "Component name cannot be empty" },
			{ elementType: 'div', classes: ['relative', 'product-field'], errorMsg: "Product cannot be empty" },
			{ elementType: 'textarea', classes: ['specification', 'required', 'required-data-field'], defaultValue: existingComponentData?.Specification || "", errorMsg: "Specification cannot be empty" },
			{ elementType: 'div', classes: ['quantity-field-div', 'required', 'field-data-content-con'], defaultValue: existingComponentData?.Quantity || "", attributes: [['onclick', 'focusOnInputField(event.target)']], errorMsg: "Input valid quantity" },
			{ elementType: 'div', classes: ['bidders-div', 'relative'], errorMsg: "Add at least one vendor" },
			{ elementType: 'div', classes: ['attachments-div', 'field-data-content-con', 'relative'] },
			// { elementType: 'button', classes: ['remove-btn'], content: '❌', attributes: [['onclick', 'removeComponentRow(event)']] }
		];

	if (existingComponentData) {
		newRow.setAttribute("component-id", existingComponentData.Id)
	}

	cellDataArray.forEach(elementData => {
		let newCell = document.createElement('td'),
			tdElement;
		tdElement = document.createElement(elementData.elementType);
		tdElement.type = elementData.type || null;
		tdElement.value = elementData.defaultValue || null;
		tdElement.innerHTML = elementData.content || null;
		elementData.classes.forEach(elementClass => {
			tdElement.classList.add(elementClass);
		})
		if (elementData.attributes) {
			elementData.attributes.forEach(elementAttribute => {
				tdElement.setAttribute(elementAttribute[0], elementAttribute[1]);
			})
		}
		if (elementData.elementType == "div") {
			let blockHTML;
			if (elementData.classes.includes('product-field')) {
				blockHTML = `
					<input type="hidden" class='product-id required-data-field' value=` + (existingComponentData?.Product?.Id || ``) + `>
					<div class="product-field-div required no-wrap field-data-content-con" onclick="displayProdSearchField(event)">` + (existingComponentData?.Product?.Name || ``) + `</div>
					<div class="prod-field-search-container shadow absolute" style="display: none">
						<input type="search" placeholder="Search Product" class="search-field" oninput="searchProduct(event)">
						<ul class="product-list absolute"></ul>
					</div>
				`
			} else if (elementData.classes.includes('quantity-field-div')) {
				blockHTML = `
					<input type="number" class="qty-input-field" value=` + elementData.defaultValue + `>
              		<input type="hidden" class="qty-values required-data-field">
				`
			} else if (elementData.classes.includes('bidders-div')) {
				blockHTML = `
					<input type="hidden" class='bidder-ids required-data-field' value='` + (existingComponentData?.Bidders.map(bidder => bidder.Id).join(',') || ``) + `'>
					<div class="bidders-field-div required field-data-content-con" onclick="displayVendorSearchField(event)">
				`;
				if (existingComponentData) {
					blockHTML += existingComponentData.Bidders.map(bidder => `
						<span class="vendor-tag" vendor-id="${bidder.Id}" onclick="displayVendorSearchField(event)">
							${bidder.Name}
							<span class="close" onclick="removeVendor('${bidder.Id}', event.target.closest('.bidders-field-div').parentElement)"></span>
						</span>
					`).join('');
				}
				blockHTML += ` 
					</div>
					<div class="vendor-field-search-container shadow absolute" style="display: none">
						<input type="search" placeholder="Search Vendor" class="search-field" oninput="searchVendor(event)">
						<ul class="vendor-list absolute"></ul>
					</div>
				`;
			} else if (elementData.classes.includes('attachments-div')) {
				blockHTML = ` 
					<button class="file-upload-button" onclick="event.target.parentElement.querySelector('.file-input').click()">Choose File <img width="15px" src="assets/upload.png" /></button>
					<input type="file" class="file-input" multiple>
					<div class="file-info"></div>
				`;
				if (existingComponentData) {
					if (existingComponentData.Attachments.length > 0) {
						blockHTML += `
							<div class="existing-container">
						`;
						blockHTML += existingComponentData.Attachments.map(attachment => `
								<div class="flex file-name-container-existing existing-file">
									<span class="existing-file-file-name">${attachment.Name}</span>
								</div>
							`).join('');
						blockHTML += `
							</div>
						`;
					}
				}
			}
			$(tdElement).append(blockHTML);
		}
		newCell.appendChild(tdElement);
		if (elementData.errorMsg) {
			let errorMsg = document.createElement('div');
			errorMsg.classList.add('error-msg')
			errorMsg.classList.add('d-none')
			errorMsg.innerHTML = elementData.errorMsg;
			newCell.appendChild(errorMsg)
		}
		newRow.appendChild(newCell);
	});
		// Create the container div
	const actionButtons = document.createElement('div');
	actionButtons.className = 'action-buttons';

	// Delete icon
	const minusIcon = document.createElement('span');
	minusIcon.className = 'icon-minus';
	minusIcon.innerHTML = '✖'; // compact trash icon
	minusIcon.onclick = () => removeComponentRow(newRow);

	// Duplicate icon
	const duplicateIcon = document.createElement('span');
	duplicateIcon.className = 'icon-duplicate';
	duplicateIcon.innerHTML = '❐'; // compact document icon
	duplicateIcon.onclick = () => duplicateComponent(event);

	// Append icons to parent
	!existingComponentData ? actionButtons.appendChild(minusIcon) : actionButtons.appendChild(duplicateIcon);

	// Append to the row
	newRow.appendChild(actionButtons);

	tbody.appendChild(newRow);
	if (!existingComponentData) {
		addEventListenerToQtyField(newRow.querySelector('.qty-input-field'));
	}
	if (dealRFQCheckbox == true) {
		$('#allComponents').find('input, textarea').attr('disabled', true).addClass('disabled');
		$('#allComponents').find('.close').remove();
		$('#allComponents').find('.field-data-content-con').addClass('disabled').attr('onclick', false)
		$('#allComponents').find('.remove-btn').remove()
		$('#allComponents').find('.attachments-div').addClass('disabled').attr('onclick', false)
	}
	establishListenerOnFileField();
}

function duplicateComponent(event) {
	xBtn = event.target;
	const row = event.target.closest('tr');
	const newRow = row.cloneNode(true);
	newRow.removeAttribute('component-id');
	newRow.classList.remove('existing-component');
	newRow.classList.add('new-component');
	const duplicateIcon = newRow.querySelector('.icon-duplicate');
	duplicateIcon.remove()
	const actionButtons = newRow.querySelector('.action-buttons')
	const minusIcon = document.createElement('span');
	minusIcon.className = 'icon-minus';
	minusIcon.innerHTML = '✖'; // compact trash icon
	minusIcon.onclick = () => removeComponentRow(newRow);
	actionButtons.appendChild(minusIcon)
	addEventListenerToQtyField(newRow.querySelector('.qty-input-field'));
	row.after(newRow);
	const qtyInputField = newRow.querySelector('.qty-input-field');
	const backspaceEvent = new KeyboardEvent('keydown', {
		key: 'Backspace',
		keyCode: 13,       // legacy property, some listeners check this
		which: 13,         // legacy property
		bubbles: true,    // allow event to bubble
		cancelable: true  // allow preventDefault
	});
	// Dispatch the event
	qtyInputField.dispatchEvent(backspaceEvent);
}

function removeComponentRow(target) {
	xBtn = target;
	// componentRow = xBtn.closest('tr');
	console.log('Current Row', target);
	target.remove();
}

// Product lookup field

function displayProdSearchField(event) {
	$('.prod-field-search-container').hide();
	let searchFiedlContainer = $(event.target).siblings('.prod-field-search-container');
	searchFiedlContainer.show();
	searchFiedlContainer.find('.search-field').focus();
}

async function searchProduct(event) {
	searchValue = event.target.value
	productList = $(event.target).siblings('.product-list');
	productList.empty();
	productList.addClass('absolute')
	if (searchValue.length >= 3) {
		let searchResult = await ZOHO.CRM.API.searchRecord({ Entity: "Products", Type: "criteria", Query: "(Product_Name:starts_with:" + searchValue + ") and (Product_Active:equals:true)" }),
			data = searchResult.data;
		if (data) {
			productList.removeClass('absolute')
			data.forEach(product => {
				if (!productList.find('[product-id="' + product.id + '"]').length > 0) {
					let li = document.createElement("li");
					li.textContent = product.Product_Name;
					li.setAttribute("product-id", product.id);
					li.setAttribute("onclick", "selectProduct(event)");
					if (product.Description) {
						li.setAttribute("product-specification", product.Description);
					}
					productList.append($(li));
				}
			})
		}
	}
}

function selectProduct(event) {
	selectedProduct = $(event.target);
	currentProductList = selectedProduct.parent();
	searchField = currentProductList.siblings('.search-field')
	productFieldContainer = selectedProduct.parent().parent().siblings('.product-field-div');
	productIdField = productFieldContainer.siblings('input.product-id');
	productIdField.val(selectedProduct.attr('product-id'));
	productFieldContainer.text(selectedProduct.text());
	currentProductList.empty();
	currentProductList.addClass('absolute');
	currentProductList.parent().hide();
	searchField.val(null);
	specificationField = productFieldContainer.parent().parent().parent().find('.specification');
	if (selectedProduct.attr('product-specification')) {
		specificationField.val(selectedProduct.attr('product-specification'))
	}
}

// Bidder multi select lookup field

function displayVendorSearchField(event) {
	$('.vendor-field-search-container').hide();
	let searchFiedlContainer;
	if ($(event.target).siblings('.vendor-field-search-container').length > 0) {
		searchFiedlContainer = $(event.target).siblings('.vendor-field-search-container');
	} else {
		searchFiedlContainer = $(event.target).parent().siblings('.vendor-field-search-container');
	}
	searchFiedlContainer.show();
	searchFiedlContainer.find('.search-field').focus();
}

async function searchVendor(event) {
	searchValue = event.target.value
	vendorList = $(event.target).siblings('.vendor-list');
	vendorList.empty();
	vendorList.addClass('absolute')
	if (searchValue.length >= 3) {
		let searchResult = await ZOHO.CRM.API.searchRecord({ Entity: "Vendors", Type: "criteria", Query: "(Vendor_Name:starts_with:" + searchValue + ")" }),
			data = searchResult.data;
		if (data) {
			vendorList.removeClass('absolute');
			data.forEach(vendor => {
				if (!vendorList.parent().siblings('.bidder-ids').val().split(',').includes(vendor.id) && !vendorList.find('[bidder-id="' + vendor.id + '"]').length > 0) {
					let li = document.createElement("li");
					li.textContent = vendor.Vendor_Name;
					li.setAttribute("bidder-id", vendor.id);
					li.setAttribute("onclick", "selectVendor(event)");
					vendorList.append($(li));
				}
			})
		}
	}
}

function selectVendor(event) {
	selectedVendor = $(event.target);
	currentVendorList = selectedVendor.parent();
	searchField = currentVendorList.siblings('.search-field')
	bidderFieldContainer = selectedVendor.parent().parent().siblings('.bidders-field-div');
	bidderIdField = bidderFieldContainer.siblings('input.bidder-id');
	bidderIdField.val(selectedVendor.attr('bidder-id'));
	currentVendorList.empty();
	currentVendorList.addClass('absolute');
	currentVendorList.parent().hide();
	searchField.val(null);

	addVendorTag(bidderFieldContainer, selectedVendor);
}

function addVendorTag(bidderFieldContainer, selectedVendor) {
	tags = bidderFieldContainer[0].parentElement.querySelector('.bidder-ids').value ? bidderFieldContainer[0].parentElement.querySelector('.bidder-ids').value.split(',') : new Array()
	bidderIdsField = bidderFieldContainer[0].parentElement.querySelector('.bidder-ids')

	let vendor = {
		vendorName: selectedVendor.text(),
		vendorId: selectedVendor.attr('bidder-id'),
		element: document.createElement('span'),
	};

	vendor.element.classList.add('vendor-tag');
	vendor.element.setAttribute("onclick", "displayVendorSearchField(event)");
	vendor.element.textContent = vendor.vendorName;

	let closeBtn = document.createElement('span');
	closeBtn.classList.add('close');
	closeBtn.addEventListener('click', function () {
		removeVendor(this.parentElement.getAttribute("vendor-id"), bidderFieldContainer[0].parentElement);
	});
	vendor.element.appendChild(closeBtn);
	tags.push(vendor.vendorId);
	vendor.element.setAttribute("vendor-id", vendor.vendorId);
	bidderFieldContainer.append($(vendor.element));
	refreshTags(tags, bidderIdsField);
}

function removeVendor(vendorId, parentContainer) {
	vendorInputFieldTags = parentContainer.querySelector('.bidder-ids')
	let tag = parentContainer.querySelector('.vendor-tag[vendor-id="' + vendorId + '"]');
	tag.remove();
	vendorTags = parentContainer.querySelectorAll('.vendor-tag')
	tags = [];
	vendorTags.forEach(tag => {
		tags.push(tag.getAttribute('vendor-id'));
	});
	refreshTags(tags, vendorInputFieldTags);
}


// Lookup field behaviour

$(document).on('click', function (event) {
	if (!$(event.target).closest('.prod-field-search-container').length && !$(event.target).is('.product-field-div')) {
		$('.prod-field-search-container').hide();
	}
	if (!$(event.target).closest('.vendor-field-search-container').length && !$(event.target).is('.bidders-field-div') && !$(event.target.parentElement).is('.bidders-field-div')) {
		$('.vendor-field-search-container').hide();
	}
});

function focusOnInputField(parentCon) {
	$(parentCon).find('input').focus();
}

// Quantity Field 

function addEventListenerToQtyField(qtyInputField) {
	tags = qtyInputField.parentElement.querySelector('.qty-values') != "" ? qtyInputField.parentElement.querySelector('.qty-values').value.split(',') : []
	qtyInputField.addEventListener('keydown', function (e) {
		let keyCode = e.which || e.keyCode;
		if (keyCode === 8 && qtyInputField.value.length === 0) {
			let qtyTags = qtyInputField.parentElement.querySelectorAll('.qty-tag'),
				lastElement = qtyTags[qtyTags.length - 1];
			if (lastElement) {
				removeTag(lastElement.getAttribute("index"), qtyInputField.parentElement);
			}
		}
		if (keyCode === 13 && qtyInputField.value && qtyInputField.value > 0) {
			addQty(qtyInputField.value, qtyInputField);
			qtyInputField.value = "";
		}
	});
}

function addQty(qtyVal, qtyInputField) {
	tags = qtyInputField.parentElement.querySelector('.qty-values').value ? qtyInputField.parentElement.querySelector('.qty-values').value.split(',') : new Array()
	qtyInputFieldTags = qtyInputField.parentElement.querySelector('.qty-values')
	let qty = {
		qty: qtyVal,
		element: document.createElement('span'),
	};

	qty.element.classList.add('qty-tag');
	qty.element.textContent = qty.qty;

	let closeBtn = document.createElement('span');
	closeBtn.classList.add('close');
	closeBtn.addEventListener('click', function () {
		removeTag(this.parentElement.getAttribute("index"), qtyInputField.parentElement);
	});
	qty.element.appendChild(closeBtn);
	tags.push(qty.qty);
	qty.element.setAttribute("index", tags.length - 1)
	$(qty.element).insertBefore($(qtyInputField));
	refreshTags(tags, qtyInputFieldTags);
}

function removeTag(index, parentContainer) {
	qtyInputFieldTags = parentContainer.querySelector('.qty-values')
	let tag = parentContainer.querySelector('.qty-tag[index="' + index + '"]');
	parentContainer.removeChild(tag);
	qtyTags = parentContainer.querySelectorAll('.qty-tag')
	tags = [];
	qtyTags.forEach(tag => {
		tags.push(tag.textContent);
	});
	refreshTags(tags, qtyInputFieldTags);
}

function refreshTags(tags, qtyInputFieldTags) {
	let tagsList = [];
	tags.forEach(function (t) {
		tagsList.push(t);
	});
	qtyInputFieldTags.value = tagsList.join(',');
}

// Utility

function createElementWithClass(tagName, classNames) {
	const element = document.createElement(tagName);
	$(classNames).each(function (i, c) {
		element.classList.add(c);
	})
	// element.classList.add(className);
	return element;
}
function validateComponentForm() {
	let formIsValid = true;
	$('.component-row').each(function (index, tr) {
		let tds = $(tr).find('td');
		tds.each(function (i, td) {
			if ($(td).find('.required-data-field').length > 0) {
				if ($(td).find('.required-data-field').hasClass('qty-values')) {
					if ($(td).find('.required-data-field').parent().parent().parent().attr('component-id')) {
						if (!$(td).find('.required-data-field').siblings('.qty-input-field').val()) {
							$(td).find('.error-msg').removeClass('d-none')
							formIsValid = false;
						} else {
							$(td).find('.error-msg').addClass('d-none')
						}
					} else {
						if (!$(td).find('.required-data-field').val()) {
							$(td).find('.error-msg').removeClass('d-none')
							formIsValid = false;
						} else {
							$(td).find('.error-msg').addClass('d-none')
						}
					}
				} else {
					if (!$(td).find('.required-data-field').val()) {
						$(td).find('.error-msg').removeClass('d-none')
						formIsValid = false;
					} else {
						$(td).find('.error-msg').addClass('d-none')
					}
				}
			}
		})
	});
	return formIsValid
}

function saveComponentForm(event) {
	if (validateComponentForm()) {
		$(event.target).text("Saving...");
		$(event.target).attr("disabled", true);
		$(event.target).removeClass("save-btn");
		$(event.target).addClass("disabled-btn");
		let currentComponentIds = [];
		$('.component-row').each(function (index, element) {
			let componentName = $(element).find('.component-name').first(),
				product = $(element).find('.product-id').first(),
				specification = $(element).find('.specification').first(),
				existingQty = $(element).find('.qty-input-field').first(),
				qtyValues = $(element).find('.qty-values').first(),
				bidders = $(element).find('.bidder-ids').first(),
				componentObj = {
					"id": null,
					"Name": componentName.val(),
					"Product": product.val(),
					"Specifications": specification.val(),
					"Deal": id[0],
					"Quantity": existingQty.val(),
					"Status": 'Active',
					"BidderIDs": bidders.val().split(',')
				};
			componentId = element.getAttribute("component-id");
			if (componentId) {
				currentComponentIds.push(componentId)
				componentObj["id"] = componentId;
				updateComponent(componentObj);
				uploadFiles(element, componentId)
			} else {
				insertComponent(componentObj, qtyValues.val().split(','), element);
			}
		})
		setRemovedComponentsToInactive(currentComponentIds);
		setTimeout(function () {
			$(event.target).text("Save");
			ZOHO.CRM.UI.Popup.closeReload();
		}, 5000)
	}
}

async function insertComponent(componentObj, qtyValues, element) {
	await $(qtyValues).each(async function (index, qty) {
		componentObj["Quantity"] = parseInt(qty);
		await ZOHO.CRM.API.insertRecord({ Entity: "Components", APIData: componentObj, Trigger: ["workflow"] })
			.then(async function (data) {
				if (data?.data[0]?.code == 'SUCCESS') {
					if (componentObj.BidderIDs.filter(item => item != null && item !== '').length > 0) {
						await $(componentObj.BidderIDs).each(async function (index, bidderId) {
							let bidderObj = {
								"Bidders": bidderId,
								"Component": data?.data[0]?.details?.id
							}
							await ZOHO.CRM.API.insertRecord({ Entity: "Components_X_Vendors", APIData: bidderObj, Trigger: ["workflow"] });
						})
					}
					uploadFiles(element, data?.data[0]?.details?.id);
				}
			})
	})
}

async function updateComponent(componentObj) {
	ZOHO.CRM.API.updateRecord({ Entity: "Components", APIData: componentObj, Trigger: ["workflow"] })
		.then(async function (data) {
			if (data?.data[0]?.code == 'SUCCESS') {
				if (componentObj.BidderIDs.filter(item => item != null && item !== '').length > 0) {
					await $(componentObj.BidderIDs).each(async function (index, bidderId) {
						let bidderObj = {
							"Bidders": bidderId,
							"Component": data?.data[0]?.details?.id
						}
						await ZOHO.CRM.API.searchRecord({ Entity: "Components_X_Vendors", Type: "criteria", Query: "(Bidders.id:equals:" + bidderId + ") and (Component.id:equals:" + componentObj.id + ")" })
							.then(async function (data) {
								if (!data.data) {
									await ZOHO.CRM.API.insertRecord({ Entity: "Components_X_Vendors", APIData: bidderObj, Trigger: ["workflow"] })
								}
							})
					})
				}
			}
			await ZOHO.CRM.API.searchRecord({ Entity: "Components_X_Vendors", Type: "criteria", Query: "(Component:equals:" + componentObj.id + ")" })
				.then(async function (data) {
					if (data) {
						oldBidders = data.data;
						if (oldBidders) {
							await oldBidders.forEach(oldBidder => {
								if (!componentObj.BidderIDs.includes(oldBidder.Bidders.id)) {
									ZOHO.CRM.API.deleteRecord({ Entity: "Components_X_Vendors", RecordID: oldBidder.id })
								}
							})
						}
					}

				})
		})
}

function setRemovedComponentsToInactive(currentComponentIds) {
	oldActiveComponentIds.forEach(oldActiveComponentId => {
		if (!currentComponentIds.includes(oldActiveComponentId)) {
			var config = {
				Entity: "Components",
				APIData: {
					"id": oldActiveComponentId,
					"Status": "Inactive"
				},
				Trigger: ["workflow"]
			}
			ZOHO.CRM.API.updateRecord(config)
		}
	})
}

// disable widget at deal stage qualification
// function disableActionsInWidgetForm(dealStage) {
// 	if (dealStage != "Qualification") {
// 		$('.add-row-btn').remove();
// 		$('.save-btn').remove();
// 	}
// }

//disable widget if rfq checkbox is clicked
function disableActionsInWidgetForm(dealRFQCheckbox) {
	if (dealRFQCheckbox == true) {
		$('.add-row-btn').remove();
		$('.save-btn').remove();
	}
}

function uploadFiles(componentRow, componentId) {
	files = componentRow.querySelectorAll('.file-name');
	files.forEach((fileTag) => {
		fileRowIndex = fileTag.dataset.inputIndex
		fileTagIndex = fileTag.dataset.fileIndex
		file = fileLists[fileRowIndex][fileTagIndex]
		ZOHO.CRM.API.attachFile({ Entity: "Components", RecordID: componentId, File: { Name: file.name, Content: file } });
	})

}

