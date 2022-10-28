(rl => {
//	if (rl.settings.get('Nextcloud'))

	addEventListener('rl-view-model.create', e => {
		if ('MailMessageView' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.saveNextcloudError = ko.observable(false).extend({ falseTimeout: 7000 });
			view.saveNextcloudLoading = ko.observable(false);
			view.saveNextcloud = () => {
				const
					hashes = (view.message()?.attachments || [])
					.map(item => item?.checked() /*&& !item?.isLinked()*/ ? item.download : '')
					.filter(v => v);
				if (hashes.length) {
					view.saveNextcloudLoading(true);
					rl.nextcloud.selectFolder().then(folder => {
						if (folder) {
							rl.fetchJSON('./?/Json/&q[]=/0/', {}, {
								Action: 'AttachmentsActions',
								Do: 'nextcloud',
								Hashes: hashes,
								NcFolder: folder
							})
							.then(result => {
								view.saveNextcloudLoading(false);
								if (result?.Result) {
									// success
								} else {
									view.saveNextcloudError(true);
								}
							})
							.catch(() => {
								view.saveNextcloudLoading(false);
								view.saveNextcloudError(true);
							});
						} else {
							view.saveNextcloudLoading(false);
						}
					});
				}
			};

			view.nextcloudSaveMsg = () => {
				rl.nextcloud.selectFolder().then(folder => {
					let msg = view.message();
					folder && rl.pluginRemoteRequest(
						(iError, data) => {
							console.dir({
								iError:iError,
								data:data
							});
						},
						'NextcloudSaveMsg',
						{
							'msgHash': msg.requestHash,
							'folder': folder,
							'filename': msg.subject()
						}
					);
				});
			};

			view.nextcloudICS = ko.computed(() => {
				let msg = view.message();
				return msg
					? msg.attachments.find(attachment => 'text/calendar' == attachment.mimeType)
					: null;
			}, {'pure':true});

			view.nextcloudSaveICS = () => {
				let attachment = view.nextcloudICS();
				attachment && rl.nextcloud.selectCalendar()
				.then(href =>
					href && rl.fetch(attachment.linkDownload())
					.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
					.then(text => rl.nextcloud.calendarPut(href, text))
				);
			}
		}
	});

	let template = document.getElementById('MailMessageView');

	const attachmentsControls = template.content.querySelector('.attachmentsControls');
	if (attachmentsControls) {
		attachmentsControls.append(Element.fromHTML(`<span>
			<i class="fontastic iconcolor-red" data-bind="visible: saveNextcloudError">✖</i>
			<i class="fontastic" data-bind="visible: !saveNextcloudError(),
				css: {'icon-spinner': saveNextcloudLoading()}">💾</i>
			<span class="g-ui-link" data-bind="click: saveNextcloud" data-i18n="NEXTCLOUD/SAVE_ATTACHMENTS"></span>
		</span>`));

		// https://github.com/nextcloud/calendar/issues/4684
		let cfg = rl.settings.get('Nextcloud');
		if (cfg.CalDAV) {
			attachmentsControls.append(Element.fromHTML(`<span data-bind="visible: nextcloudICS" data-icon="📅">
				<span class="g-ui-link" data-bind="click: nextcloudSaveICS" data-i18n="NEXTCLOUD/SAVE_ICS"></span>
			</span>`));
		}
	}

	const msgMenu = template.content.querySelector('#more-view-dropdown-id + menu');
	if (msgMenu) {
		msgMenu.append(Element.fromHTML(`<li role="presentation">
			<a href="#" tabindex="-1" data-icon="📥" data-bind="click: nextcloudSaveMsg" data-i18n="NEXTCLOUD/SAVE_EML"></a>
		</li>`));
	}

})(window.rl);
