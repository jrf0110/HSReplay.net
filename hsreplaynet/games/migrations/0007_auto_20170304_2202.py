# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-03-04 22:02
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0006_auto_20170304_2151'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamereplay',
            name='upload_ip',
            field=models.GenericIPAddressField(help_text='Uploader IP address', null=True),
        ),
        migrations.AddField(
            model_name='gamereplay',
            name='user_agent',
            field=models.CharField(null=True, help_text='Uploader User-Agent', max_length=100),
        ),
    ]