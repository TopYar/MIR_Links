package ru.andrewkir.mirlinks.DataClasses

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.android.parcel.Parcelize
import java.io.Serializable

data class LinksInfoObject(
    var links: List<LinkDetailInfo>
)

data class TransactionsInfoObject(
    var transactions: List<TransactionInfo>
)

data class LinkInfoShort(
    var linkId: String
)


data class InfoRoot<T>(
    var info: T
)


data class LinkInfo(
    var PAM: PAM,
    var linkType: String,
    var linkName: String,
    var message: String?,
    var specifiedSum: Double?,
    var expiryDate: String?,
    var sumLimit: Double?
)

@Parcelize
data class PAM(
    var name:String,
    var accountNumber: String
):Parcelable

@Parcelize
data class LinkDetailInfo(
    var linkId: String,
    var linkName: String,
    var PAM: PAM,
    var linkType: String,
    var message: String?,
    var specifiedSum: Double?,
    var expiryDate: String?,
    var sumLimit: Double?
):Parcelable

data class TransactionInfo(
    var sum: Double,
    var name: String,
    var date: String,
    var transactionId: String?,
    var linkId: String?,
    var fromBankIdentificationNumber: String?,
    var fromAccountNumber: String?
)