package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.graphics.Color
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_existing_links.*
import kotlinx.android.synthetic.main.activity_main.swiperefresh
import ru.andrewkir.mirlinks.DataClasses.LinkDetailInfo
import ru.andrewkir.mirlinks.Api.ApiClient
import android.content.Intent
import androidx.recyclerview.widget.DividerItemDecoration
import ru.andrewkir.mirlinks.Adapters.LinkInfoRecyclerAdapter
import ru.andrewkir.mirlinks.R
import ru.andrewkir.mirlinks.accountNumber
import ru.andrewkir.mirlinks.authToken

class ExistingLinksActivity : AppCompatActivity() {

    var links: List<LinkDetailInfo> = emptyList()
    var adapter: LinkInfoRecyclerAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_existing_links)

        makeStatusBarTransparent()
        window.decorView.systemUiVisibility = window.decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()

        adapter =
            LinkInfoRecyclerAdapter(links, this)
        linksRecyclerView.layoutManager = LinearLayoutManager(this)
        linksRecyclerView.adapter = adapter
        linksRecyclerView.addItemDecoration(
            DividerItemDecoration(
                linksRecyclerView.getContext(),
                DividerItemDecoration.VERTICAL
            )
        )

        getAllLinks()
        swiperefresh.setOnRefreshListener {
            getAllLinks()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?){
        super.onActivityResult(requestCode, resultCode, data)
        finish();
        startActivity(intent);
    }

    fun Activity.makeStatusBarTransparent() {
        window.apply {
            clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            statusBarColor = Color.TRANSPARENT
        }
    }

    fun getAllLinks() {
        val apiService = ApiClient.instance
        apiService.getAllLinks(
            authToken,
            accountNumber
        )
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ res ->
                swiperefresh.isRefreshing = false
                links = res.links
                adapter = LinkInfoRecyclerAdapter(
                    links,
                    this
                )
                linksRecyclerView.adapter = adapter
            }, { error ->
                swiperefresh.isRefreshing = false
                error.printStackTrace()
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }

    fun getLinkInfo() {
        val apiService = ApiClient.instance
        apiService.getLinkInfo(authToken, links[0].linkId)
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ resInf ->
                Log.d("RESPONSE", resInf.toString())
                Toast.makeText(applicationContext, resInf.info.PAM.toString(), Toast.LENGTH_LONG)
                    .show()
            }, { error ->
                error.printStackTrace()
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }
}
