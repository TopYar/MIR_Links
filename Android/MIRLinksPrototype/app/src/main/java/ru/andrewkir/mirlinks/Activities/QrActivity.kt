package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.graphics.Color
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.journeyapps.barcodescanner.BarcodeEncoder
import kotlinx.android.synthetic.main.activity_qr.*
import ru.andrewkir.mirlinks.R

class QrActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr)
        makeStatusBarTransparent()

        val b = intent.extras
        val value = b?.getString("link")

        qrText.text = value

        val writer = MultiFormatWriter()
        val matrix = writer.encode(value, BarcodeFormat.QR_CODE, 350, 350)
        val encoder = BarcodeEncoder()
        val bitmap = encoder.createBitmap(matrix)
        qrImage.setImageBitmap(bitmap)
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
}