# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-08-24 14:13
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decks', '0005_auto_20170801_0912'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='signature',
            options={'get_latest_by': 'as_of'},
        ),
        migrations.AddField(
            model_name='archetype',
            name='deleted',
            field=models.BooleanField(default=False),
        ),
    ]
