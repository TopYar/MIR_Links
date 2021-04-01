const serverRoot = 'https://yar.cx/links'

const transactionsList = document.querySelector('.transactions-list')
const transactionsListContainer = document.querySelector(
	'.transactions-list_container'
)
const previoisPageButton = document.querySelector(
	'.transactions-list_previous-page-button'
)
const nextPageButton = document.querySelector(
	'.transactions-list_next-page-button'
)
const raisedSum = document.querySelector('.raised-sum')
const targetSum = document.querySelector('.target-sum')

const transactionFetchErrorTmpl = document.querySelector(
	'#transactionfetcherrortmpl'
).text
const transactionItemTmpl = document.querySelector('#transactiontmpl').text
const raiseProgressbar = document.querySelector('.bar > progress')
const progressPercentage = document.querySelector('.percent_progress')

const transactionFetchError = doT.template(transactionFetchErrorTmpl)
const transactionItem = doT.template(transactionItemTmpl)

let Dashboard = {
	updateInterval: undefined,
	currentOffset: 0,
	transactionsCount: 0,
	targetSum: targetSum.attributes['data-sumlimit'].value,
	raisedSum: 0,
}

previoisPageButton.addEventListener('click', e => {
	if (!e.currentTarget.classList.contains('disabled'))
		changePage(Dashboard.currentOffset - 10)
})
nextPageButton.addEventListener('click', e => {
	if (!e.currentTarget.classList.contains('disabled'))
		changePage(Dashboard.currentOffset + 10)
})

async function fetchTransactions(offset) {
	transactionsListContainer.classList.add('disabled')

	await fetch(`${serverRoot}/last_transactions/${linkId}`, {
		headers: { offset },
	})
		.then(res => (res.ok ? res.json() : Promise.reject(res)))
		.then(data => {
			if (data.count != Dashboard.transactionsCount) updateInfo(data)

			if (data.transactions) {
				transactionsList.innerHTML = ''
				for (let transaction of data.transactions)
					transactionsList.innerHTML += transactionItem(transaction)
			}
		})
		.catch(err => {
			console.log(err)
			transactionsList.innerHTML = transactionFetchError()
			stopDashboardUpdater()
		})

	await (function () {
		return new Promise(resolve => setTimeout(resolve, 1000))
	})()

	updateControlButtons()
	transactionsListContainer.classList.remove('disabled')
}

function restartDashboardUpdater(delay = 20000) {
	if (Dashboard.updateInterval) clearInterval(Dashboard.updateInterval)

	fetchTransactions(Dashboard.currentOffset)

	Dashboard.updateInterval = setInterval(
		() => fetchTransactions(Dashboard.currentOffset),
		delay
	)
}

function stopDashboardUpdater() {
	if (Dashboard.updateInterval) clearInterval(Dashboard.updateInterval)
	transactionsListContainer.classList.remove('disabled')
}

function changePage(newOffset) {
	Dashboard.currentOffset = Math.max(0, newOffset)

	updateControlButtons()
	restartDashboardUpdater()
}

function updateControlButtons() {
	if (Dashboard.currentOffset < 10)
		previoisPageButton.classList.add('disabled')
	else previoisPageButton.classList.remove('disabled')

	if (Dashboard.currentOffset + 10 >= Dashboard.transactionsCount)
		nextPageButton.classList.add('disabled')
	else nextPageButton.classList.remove('disabled')
}

function updateInfo({ raise_sum, count }) {
	Dashboard.raisedSum = raise_sum
	Dashboard.transactionsCount = count

	let percentage = (Dashboard.raisedSum / Dashboard.targetSum) * 100

	raiseProgressbar.value = Math.min(100, percentage)
	progressPercentage.textContent = `${percentage.toFixed(2)}%`
	raisedSum.textContent = Dashboard.raisedSum
}

;(function init() {
	targetSum.textContent = Dashboard.targetSum

	updateControlButtons()
	restartDashboardUpdater()
})()
