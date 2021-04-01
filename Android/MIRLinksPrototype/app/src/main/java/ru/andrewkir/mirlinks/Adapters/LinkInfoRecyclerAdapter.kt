package ru.andrewkir.mirlinks.Adapters

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import ru.andrewkir.mirlinks.DataClasses.LinkDetailInfo
import ru.andrewkir.mirlinks.Activities.ExistingLinksActivity
import ru.andrewkir.mirlinks.Activities.LinkInfoActivity
import ru.andrewkir.mirlinks.R
import java.text.DecimalFormat
class LinkInfoRecyclerAdapter(private val dataSet: List<LinkDetailInfo>, val activity: ExistingLinksActivity) :
    RecyclerView.Adapter<LinkInfoRecyclerAdapter.ViewHolder>() {
    private val context: Context? = activity

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val linkId: TextView = view.findViewById(R.id.linkIdView)
        val linkName: TextView = view.findViewById(R.id.linkNameView)
        val linkDate: TextView = view.findViewById(R.id.linkDateView)
        val linkFixed: TextView = view.findViewById(R.id.linkFixedView)
    }

    override fun onCreateViewHolder(viewGroup: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(viewGroup.context)
            .inflate(R.layout.link_raw_object_new, viewGroup, false)

        return ViewHolder(
            view
        )
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, position: Int) {
        viewHolder.linkId.paintFlags = viewHolder.linkId.paintFlags or Paint.UNDERLINE_TEXT_FLAG
        viewHolder.linkId.setOnClickListener {
            val intent = Intent(activity, LinkInfoActivity::class.java)
            val b = Bundle()
            b.putParcelable("data", dataSet[position])
            intent.putExtras(b)
            (context as Activity).startActivityForResult(intent, 1)
        }
        viewHolder.itemView.setOnClickListener {
            val intent = Intent(activity, LinkInfoActivity::class.java)
            val b = Bundle()
            b.putParcelable("data", dataSet[position])
            intent.putExtras(b)
            (context as Activity).startActivityForResult(intent, 1)
        }

        val decFormat = DecimalFormat("###.#")
        viewHolder.linkName.text = dataSet[position].linkName
        viewHolder.linkId.text = dataSet[position].linkId
        viewHolder.linkDate.text = if (dataSet[position].expiryDate == null) "∞" else dataSet[position].expiryDate!!.split(" ")[0]
        viewHolder.linkFixed.text = if (dataSet[position].specifiedSum == null) "" else decFormat.format(dataSet[position].specifiedSum) + " ₽"
    }

    override fun getItemCount() = dataSet.size
}
