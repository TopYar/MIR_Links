package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.view.animation.Animation
import android.view.animation.Transformation
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_link_info.*
import kotlinx.android.synthetic.main.activity_main.swiperefresh
import ru.andrewkir.mirlinks.Adapters.TransactionInfoRecyclerAdapter
import ru.andrewkir.mirlinks.DataClasses.LinkDetailInfo
import ru.andrewkir.mirlinks.DataClasses.TransactionInfo
import ru.andrewkir.mirlinks.R
import ru.andrewkir.mirlinks.Api.ApiClient
import ru.andrewkir.mirlinks.authToken
import java.text.DecimalFormat
import kotlin.math.roundToInt


class LinkInfoActivity : AppCompatActivity() {
    var transactions: List<TransactionInfo> = emptyList()
    var adapter: TransactionInfoRecyclerAdapter? = null
    var linkId: String = ""
    var sumGoal: Double = 0.0
    val decFormat = DecimalFormat("###.#")
    var refreshSum = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_link_info)

        makeStatusBarTransparent()

        val messageView = findViewById<TextView>(R.id.messageView)

        val b = intent.extras
        val value = b?.getParcelable<LinkDetailInfo>("data")

        messageView.text = if (value?.message.isNullOrEmpty()) value?.linkName else value?.message
        linkId = value?.linkId.toString()

        sumGoal = value?.sumLimit!!
        if(sumGoal == 0.0){
            findViewById<View>(R.id.gridGoal).visibility = View.GONE;
            refreshSum = false
        }
        else
            progressBar.max = (sumGoal * 100).roundToInt()

        linkIdView.text = linkIdView.text.toString() + value?.linkId

        copyButton.setOnClickListener(View.OnClickListener {
            setClipboard();
        })
        shareButton.setOnClickListener(View.OnClickListener{
            val text = "https://" + findViewById<TextView>(R.id.linkIdView).text.toString()
            val sendIntent: Intent = Intent().apply {
                action = Intent.ACTION_SEND
                putExtra(Intent.EXTRA_TEXT, text)
                type = "text/plain"
            }

            val shareIntent = Intent.createChooser(sendIntent, null)
            startActivity(shareIntent)
        })
        deleteButton.setOnClickListener(View.OnClickListener {
            deleteLink()
            setResult(RESULT_OK)
            super.finish()
        })
        qrButton.setOnClickListener(View.OnClickListener {
            val intent = Intent(this, QrActivity::class.java)
            val b = Bundle()
            b.putString("link", "https://" + findViewById<TextView>(R.id.linkIdView).text.toString())
            intent.putExtras(b)
            startActivity(intent)
        })

        adapter = TransactionInfoRecyclerAdapter(transactions)
        transactionsRecyclerView.layoutManager = LinearLayoutManager(this)
        transactionsRecyclerView.adapter = adapter
        transactionsRecyclerView.addItemDecoration(
            DividerItemDecoration(
                transactionsRecyclerView.getContext(),
                DividerItemDecoration.VERTICAL
            )
        )

        getAllTransactions()
        swiperefresh.setOnRefreshListener {
            getAllTransactions()
        }
    }

    private fun Activity.makeStatusBarTransparent() {
        window.apply {
            clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            statusBarColor = Color.TRANSPARENT
        }
    }

    fun getAllTransactions() {
        val apiService = ApiClient.instance
        apiService.getLinkTransactions(authToken, linkId)
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ res ->
                swiperefresh.isRefreshing = false
                transactions = res.transactions
                adapter = TransactionInfoRecyclerAdapter(transactions)
                transactionsRecyclerView.adapter = adapter

                val sum = transactions.sumByDouble { it.sum }
                sumView.text = decFormat.format(sum) + " ₽"

                if(refreshSum){
                    progressSumView.text = decFormat.format(sum) + " ₽ из " + decFormat.format(sumGoal) + " ₽"
                    val anim = ProgressBarAnimation(progressBar, 0f, (sum * 100).toFloat())
                    anim.duration = 750
                    progressBar.startAnimation(anim)
                }
            }, { error ->
                swiperefresh.isRefreshing = false
                error.printStackTrace()
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }

    fun getRandomString(length: Int): String {
        val allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz0123456789"
        return (1..length)
            .map { allowedChars.random() }
            .joinToString("")
    }

    fun deleteLink() {
        val apiService = ApiClient.instance
        apiService.deleteLink(authToken, getRandomString(30), linkId).observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ res ->
                Toast.makeText(this, "Ссылка успешно удалена", Toast.LENGTH_SHORT).show()
            }, { error ->
                error.printStackTrace()
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }

    private fun setClipboard() {
        val text = findViewById<TextView>(R.id.linkIdView).text
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
        val clip = ClipData.newPlainText("Copied Text", "https://$text")
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this, "Ссылка скопирована в буфер обмена", Toast.LENGTH_SHORT).show()
    }
}

class ProgressBarAnimation(
    private val progressBar: ProgressBar,
    private val from: Float,
    private val to: Float
) :
    Animation() {
    override fun applyTransformation(
        interpolatedTime: Float,
        t: Transformation?
    ) {
        super.applyTransformation(interpolatedTime, t)
        val value = from + (to - from) * interpolatedTime
        progressBar.progress = value.toInt()
    }

}