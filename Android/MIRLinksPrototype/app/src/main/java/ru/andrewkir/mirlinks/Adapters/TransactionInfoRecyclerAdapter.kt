package ru.andrewkir.mirlinks.Adapters

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import ru.andrewkir.mirlinks.DataClasses.TransactionInfo
import ru.andrewkir.mirlinks.R
import java.text.DecimalFormat


class TransactionInfoRecyclerAdapter(private val dataSet: List<TransactionInfo>) :
    RecyclerView.Adapter<TransactionInfoRecyclerAdapter.ViewHolder>() {
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val transactionName: TextView = view.findViewById(R.id.transactionNameView)
        val transactionAmount: TextView = view.findViewById(R.id.transactionAmountView)
        val transactionDate: TextView = view.findViewById(R.id.transactionDateView)
        val transactionTime: TextView = view.findViewById(R.id.transactionTimeView)
    }

    override fun onCreateViewHolder(viewGroup: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(viewGroup.context)
            .inflate(R.layout.transaction_raw_object, viewGroup, false)

        return ViewHolder(
            view
        )
    }

    @SuppressLint("SetTextI18n")
    override fun onBindViewHolder(viewHolder: ViewHolder, position: Int) {
        val decFormat = DecimalFormat("###.#")
        viewHolder.transactionName.text = dataSet[position].name
        viewHolder.transactionDate.text = dataSet[position].date.split(" ")[0]
        viewHolder.transactionAmount.text = "+" + decFormat.format(dataSet[position].sum)
        viewHolder.transactionTime.text = dataSet[position].date.split(" ")[1]
    }

    override fun getItemCount() = dataSet.size
}
